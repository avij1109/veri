// Hallucination guard - validates LLM claims against source contexts

/**
 * Verify that claims in the verdict are backed by evidence
 */
export function verifyVerdict(verdict, contexts) {
  console.log('[HallucinationGuard] Verifying verdict against contexts');
  
  if (!verdict || !contexts || contexts.length === 0) {
    return {
      ...verdict,
      verificationStatus: 'UNVERIFIED',
      verificationError: 'Missing verdict or contexts'
    };
  }
  
  const verifiedVerdict = { ...verdict };
  const verificationResults = {
    totalClaims: 0,
    verifiedClaims: 0,
    unverifiedClaims: 0,
    partiallyVerified: 0
  };
  
  // Build searchable context map
  const contextTexts = contexts.map(ctx => ({
    id: ctx.id || ctx.chunkIndex,
    text: (ctx.text || ctx.metadata?.text || '').toLowerCase(),
    source: ctx.source,
    url: ctx.sourceUrl || ctx.metadata?.url
  }));
  
  // Verify findings
  if (verdict.findings && Array.isArray(verdict.findings)) {
    verifiedVerdict.findings = verdict.findings.map(finding => {
      const verification = verifyFinding(finding, contextTexts);
      verificationResults.totalClaims++;
      
      if (verification.verified) {
        verificationResults.verifiedClaims++;
      } else if (verification.partialMatch) {
        verificationResults.partiallyVerified++;
      } else {
        verificationResults.unverifiedClaims++;
      }
      
      return {
        ...finding,
        verification
      };
    });
  }
  
  // Verify contradictions
  if (verdict.contradictions && Array.isArray(verdict.contradictions)) {
    verifiedVerdict.contradictions = verdict.contradictions.map(contra => {
      const verification = verifyContradiction(contra, contextTexts);
      verificationResults.totalClaims++;
      
      if (verification.verified) {
        verificationResults.verifiedClaims++;
      } else {
        verificationResults.unverifiedClaims++;
      }
      
      return {
        ...contra,
        verification
      };
    });
  }
  
  // Calculate verification score
  const verificationScore = verificationResults.totalClaims > 0
    ? (verificationResults.verifiedClaims + (verificationResults.partiallyVerified * 0.5)) / verificationResults.totalClaims
    : 1.0;
  
  // Adjust confidence based on verification
  if (verdict.confidence) {
    verifiedVerdict.originalConfidence = verdict.confidence;
    verifiedVerdict.confidence = verdict.confidence * verificationScore;
  }
  
  // Add verification metadata
  verifiedVerdict.verification = {
    status: verificationScore >= 0.8 ? 'VERIFIED' : verificationScore >= 0.5 ? 'PARTIALLY_VERIFIED' : 'UNVERIFIED',
    score: verificationScore,
    ...verificationResults,
    timestamp: new Date().toISOString()
  };
  
  console.log(`[HallucinationGuard] Verification complete: ${verificationResults.verifiedClaims}/${verificationResults.totalClaims} claims verified (${(verificationScore * 100).toFixed(1)}%)`);
  
  return verifiedVerdict;
}

/**
 * Verify a single finding against contexts
 */
function verifyFinding(finding, contextTexts) {
  const { detail, evidence = [] } = finding;
  const detailLower = (detail || '').toLowerCase();
  
  let matchedSources = [];
  let foundInContext = false;
  let partialMatch = false;
  
  // Check if evidence citations match actual contexts
  for (const evidenceItem of evidence) {
    const contextMatch = evidenceItem.match(/\[CONTEXT (\d+)\]/);
    if (contextMatch) {
      const contextNum = parseInt(contextMatch[1]) - 1;
      if (contextNum >= 0 && contextNum < contextTexts.length) {
        matchedSources.push(contextTexts[contextNum]);
        foundInContext = true;
      }
    }
  }
  
  // If no explicit citations, check if detail content appears in any context
  if (!foundInContext && detailLower) {
    // Extract key phrases from the detail
    const keyPhrases = extractKeyPhrases(detailLower);
    
    for (const phrase of keyPhrases) {
      for (const ctx of contextTexts) {
        if (ctx.text.includes(phrase)) {
          matchedSources.push(ctx);
          partialMatch = true;
          break;
        }
      }
      if (partialMatch) break;
    }
  }
  
  return {
    verified: foundInContext,
    partialMatch,
    matchedSources: matchedSources.map(s => ({ source: s.source, url: s.url })),
    evidenceCited: evidence.length > 0,
    confidence: foundInContext ? 1.0 : partialMatch ? 0.5 : 0.0
  };
}

/**
 * Verify contradiction against contexts
 */
function verifyContradiction(contradiction, contextTexts) {
  const { claim, contradiction: contraText, sources = [] } = contradiction;
  
  let verifiedSources = 0;
  const matchedContexts = [];
  
  for (const source of sources) {
    const contextMatch = source.match(/\[CONTEXT (\d+)\]/);
    if (contextMatch) {
      const contextNum = parseInt(contextMatch[1]) - 1;
      if (contextNum >= 0 && contextNum < contextTexts.length) {
        verifiedSources++;
        matchedContexts.push(contextTexts[contextNum]);
      }
    }
  }
  
  return {
    verified: verifiedSources >= 2, // Need at least 2 sources for contradiction
    sourceCount: sources.length,
    verifiedSourceCount: verifiedSources,
    matchedContexts: matchedContexts.map(c => ({ source: c.source, url: c.url })),
    confidence: verifiedSources >= 2 ? 1.0 : verifiedSources === 1 ? 0.5 : 0.0
  };
}

/**
 * Extract key phrases from text for fuzzy matching
 */
function extractKeyPhrases(text) {
  // Remove common words and extract significant phrases
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can']);
  
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  
  // Create 2-3 word phrases
  const phrases = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(words.slice(i, i + 2).join(' '));
    if (i < words.length - 2) {
      phrases.push(words.slice(i, i + 3).join(' '));
    }
  }
  
  return phrases.slice(0, 10); // Return top 10 phrases
}

/**
 * Flag potential hallucinations
 */
export function flagHallucinations(verdict) {
  const flags = [];
  
  // Check for unverified findings
  if (verdict.findings) {
    const unverified = verdict.findings.filter(f => 
      f.verification && !f.verification.verified && !f.verification.partialMatch
    );
    
    if (unverified.length > 0) {
      flags.push({
        type: 'unverified_findings',
        severity: 'medium',
        count: unverified.length,
        message: `${unverified.length} findings could not be verified against source contexts`
      });
    }
  }
  
  // Check for low verification score
  if (verdict.verification && verdict.verification.score < 0.5) {
    flags.push({
      type: 'low_verification_score',
      severity: 'high',
      score: verdict.verification.score,
      message: `Overall verification score is low: ${(verdict.verification.score * 100).toFixed(1)}%`
    });
  }
  
  // Check for missing evidence
  if (verdict.findings) {
    const missingEvidence = verdict.findings.filter(f => !f.evidence || f.evidence.length === 0);
    if (missingEvidence.length > 0) {
      flags.push({
        type: 'missing_evidence',
        severity: 'low',
        count: missingEvidence.length,
        message: `${missingEvidence.length} findings lack evidence citations`
      });
    }
  }
  
  return {
    hasFlags: flags.length > 0,
    flags,
    severityLevel: flags.some(f => f.severity === 'high') ? 'high' : flags.some(f => f.severity === 'medium') ? 'medium' : 'low'
  };
}
