#!/usr/bin/env node

import dotenv from 'dotenv';
import { connectDB } from "./connect.js";
import { initializeDatabase } from './database.js';
import EvaluationScheduler from './scheduler.js';

// Load environment variables
dotenv.config();

console.log('🤖 VeriAI Automated Model Evaluation System');
console.log('============================================');

async function startAutomationSystem() {
  try {
    // Connect to database
    console.log('📊 Connecting to database...');
    await connectDB();
    
    // Initialize evaluation database
    console.log('🔧 Initializing evaluation database...');
    await initializeDatabase();
    
    // Initialize and start the automated evaluation scheduler
    console.log('⚡ Starting automated evaluation scheduler...');
    const evaluationScheduler = new EvaluationScheduler();
    await evaluationScheduler.initialize();
    
    // Start the scheduler with configurable interval (default: 6 hours)
    const intervalHours = process.env.EVALUATION_INTERVAL_HOURS || 6;
    evaluationScheduler.startScheduler(parseInt(intervalHours));
    
    console.log(`✅ Automation system started successfully!`);
    console.log(`📅 Scheduled evaluations every ${intervalHours} hours`);
    console.log(`🔄 Press Ctrl+C to stop the automation system`);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down automation system...');
      evaluationScheduler.stopScheduler();
      console.log('✅ Automation system stopped gracefully');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down automation system...');
      evaluationScheduler.stopScheduler();
      console.log('✅ Automation system stopped gracefully');
      process.exit(0);
    });
    
    // Keep the process running
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      evaluationScheduler.stopScheduler();
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      evaluationScheduler.stopScheduler();
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start automation system:', error);
    process.exit(1);
  }
}

// Start the automation system
startAutomationSystem();