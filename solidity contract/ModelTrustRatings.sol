// SPDX-License-Identifier: MIT

// File: @openzeppelin/contracts/utils/Context.sol


// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.30;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// File: @openzeppelin/contracts/access/Ownable.sol


// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.30;


/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// File: @openzeppelin/contracts/utils/ReentrancyGuard.sol


// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.30;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}

// File: @openzeppelin/contracts/utils/Pausable.sol


// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

pragma solidity ^0.8.30;


/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

// File: contracts/ai.sol


pragma solidity ^0.8.30;




/**
 * @title ModelTrustRatings - Hybrid On-Chain/Off-Chain Rating System
 * @dev This contract implements a hybrid architecture where:
 *      - ON-CHAIN: Stores minimal essential data (score, stake, metadataHash, timestamp)
 *      - OFF-CHAIN: Stores detailed metadata (comments, context, user profiles) in backend
 *      - VERIFICATION: Anyone can fetch metadataHash -> get full metadata -> verify integrity
 * 
 * Benefits:
 * - Gas efficient: Only 32 bytes for metadata hash vs unlimited string storage
 * - Scalable: No string length limits
 * - Transparent: All essential data on-chain, detailed data accessible via hash
 * - Cost-effective: Significant gas savings for detailed comments
 */
contract ModelTrustRatings is Ownable, ReentrancyGuard, Pausable {
    constructor() Ownable(msg.sender) {}
    
    // PRODUCTION SETTINGS
    uint256 public MAX_STAKE_PER_RATING = 1 ether;         // Prevents whale dominance (configurable) - 1 AVAX
    uint256 public constant MAX_REPUTATION_WEIGHT = 10000; // Caps weight calculation
    uint256 private constant CHUNK_SIZE = 100;             // For chunked operations

    struct Rating {
        address user;
        uint8 score;        // 1-5 stars
        bytes32 metadataHash; // Points to off-chain metadata (comment, context, etc.)
        uint256 stake;      // AVAX staked
        uint256 timestamp;
        bool slashed;
        uint256 weight;     // Pre-calculated weight for gas efficiency
    }
    
    struct UserData {
        uint256 reputation;
        uint256 totalStaked;
        uint256 ratingsGiven;
    }
    
    struct ModelStats {
        uint256 totalWeightedScore;
        uint256 totalWeight;
        uint256 activeRatingsCount;
        uint256 totalRatingsCount;
        uint256 totalStaked;
    }
    
    mapping(bytes32 => Rating[]) public modelRatings; // keccak256(slug) -> ratings
    mapping(address => UserData) public users;
    mapping(bytes32 => uint256) public modelTrustScores;
    mapping(bytes32 => mapping(address => bool)) public hasRated; // Prevent double rating
    mapping(bytes32 => mapping(address => uint256)) public userRatingIndex; // User -> rating index for O(1) lookup
    
    // NEW: Incremental tracking mappings
    mapping(bytes32 => ModelStats) private modelStats;
    
    event RatingSubmitted(bytes32 indexed modelId, string slug, address indexed user, uint8 score, bytes32 metadataHash);
    event RatingSlashed(bytes32 indexed modelId, uint256 ratingIndex, address user);
    event TrustScoreUpdated(bytes32 indexed modelId, uint256 newScore);
    event RatingUpdated(bytes32 indexed modelId, address indexed user, uint8 newScore, bytes32 metadataHash);
    event StakeAdded(bytes32 indexed modelId, address indexed user, uint256 amount);
    
    function submitRating(string calldata slug, uint8 score, bytes32 metadataHash) 
        external payable whenNotPaused
    {
        require(score >= 1 && score <= 5, "Score must be 1-5");
        require(msg.value > 0, "Must stake AVAX");
        require(msg.value <= MAX_STAKE_PER_RATING, "Stake exceeds maximum allowed");
        require(metadataHash != bytes32(0), "Metadata hash cannot be empty");
        
        bytes32 modelId = keccak256(abi.encodePacked(slug)); // Single keccak256 call
        require(!hasRated[modelId][msg.sender], "Already rated this model");
        
        // Calculate weight based on current reputation with cap
        uint256 weight = _sqrt(users[msg.sender].reputation + 1);
        
        // Apply stake multiplier (square root of stake in wei for gradual scaling)
        uint256 stakeMultiplier = _sqrt(msg.value / 1e15); // Scale by finney for reasonable multiplier
        weight = weight * (1000 + stakeMultiplier) / 1000; // 1x + stake bonus
        
        // Store rating
        uint256 ratingIndex = modelRatings[modelId].length;
        modelRatings[modelId].push(Rating({
            user: msg.sender,
            score: score,
            metadataHash: metadataHash,
            stake: msg.value,
            timestamp: block.timestamp,
            slashed: false,
            weight: weight
        }));
        
        // Update tracking
        hasRated[modelId][msg.sender] = true;
        userRatingIndex[modelId][msg.sender] = ratingIndex;
        
        // Update user data
        users[msg.sender].ratingsGiven++;
        users[msg.sender].totalStaked += msg.value;
        users[msg.sender].reputation += 1;
        
        // OPTIMIZED: Incremental stats update
        _addToModelStats(modelId, score, weight, msg.value);
        
        // OPTIMIZED: Constant-time trust score calculation
        _updateTrustScoreIncremental(modelId);
        
        emit RatingSubmitted(modelId, slug, msg.sender, score, metadataHash);
    }
    
    function updateRating(string calldata slug, uint8 newScore, bytes32 newMetadataHash)
        external payable whenNotPaused
    {
        require(newScore >= 1 && newScore <= 5, "Score must be 1-5");
        require(newMetadataHash != bytes32(0), "Metadata hash cannot be empty");
        
        bytes32 modelId = keccak256(abi.encodePacked(slug)); // Single keccak256 call
        require(hasRated[modelId][msg.sender], "No existing rating to update");
        
        uint256 ratingIndex = userRatingIndex[modelId][msg.sender];
        Rating storage rating = modelRatings[modelId][ratingIndex];
        
        require(!rating.slashed, "Rating already slashed");
        
        // Check stake limits for additional stake
        if (msg.value > 0) {
            require(rating.stake + msg.value <= MAX_STAKE_PER_RATING, "Total stake would exceed maximum");
        }
        
        // OPTIMIZED: Remove old contribution from stats
        _removeFromModelStats(modelId, rating.score, rating.weight);
        
        // Handle additional stake first
        if (msg.value > 0) {
            rating.stake += msg.value;
            users[msg.sender].totalStaked += msg.value;
            modelStats[modelId].totalStaked += msg.value;
            emit StakeAdded(modelId, msg.sender, msg.value);
        }
        
        // Calculate new weight with updated reputation and stake
        uint256 newWeight = _sqrt(users[msg.sender].reputation + 1);
        uint256 stakeMultiplier = _sqrt(rating.stake / 1e15);
        newWeight = newWeight * (1000 + stakeMultiplier) / 1000;
        
        // Update rating
        rating.score = newScore;
        rating.metadataHash = newMetadataHash;
        rating.weight = newWeight;
        rating.timestamp = block.timestamp;
        
        // OPTIMIZED: Add new contribution to stats
        _addToModelStats(modelId, newScore, newWeight, 0);
        
        // OPTIMIZED: Constant-time trust score calculation
        _updateTrustScoreIncremental(modelId);
        
        emit RatingUpdated(modelId, msg.sender, newScore, newMetadataHash);
    }
    
    // OPTIMIZED: Constant-time trust score calculation with refined confidence scaling
    // Score Scale: 20 = 1 star, 40 = 2 stars, 60 = 3 stars, 80 = 4 stars, 100 = 5 stars
    function _updateTrustScoreIncremental(bytes32 modelId) internal {
        ModelStats storage stats = modelStats[modelId];
        
        if (stats.activeRatingsCount == 0) {
            modelTrustScores[modelId] = 0;
            emit TrustScoreUpdated(modelId, 0);
            return;
        }
        
        // Calculate base score using pre-computed totals (1-5 scale * 20 = 20-100 scale)
        uint256 baseScore = (stats.totalWeightedScore * 20) / stats.totalWeight;
        
        // Refined confidence factor with smoother scaling
        uint256 confidenceFactor;
        if (stats.activeRatingsCount >= 20) {
            confidenceFactor = 100; // Full confidence with 20+ ratings
        } else if (stats.activeRatingsCount >= 5) {
            // Smooth interpolation between 5-20 ratings: 80% to 100%
            // Formula: 80 + (count - 5) * 20/15 = 80 + (count - 5) * 4/3
            confidenceFactor = 80 + ((stats.activeRatingsCount - 5) * 4) / 3;
        } else {
            // Linear scaling: 16% per rating up to 5 ratings (0-80%)
            confidenceFactor = stats.activeRatingsCount * 16;
        }
        
        modelTrustScores[modelId] = (baseScore * confidenceFactor) / 100;
        
        emit TrustScoreUpdated(modelId, modelTrustScores[modelId]);
    }
    
    // Helper function to add to model stats
    function _addToModelStats(bytes32 modelId, uint8 score, uint256 weight, uint256 stake) internal {
        ModelStats storage stats = modelStats[modelId];
        stats.totalWeightedScore += score * weight;
        stats.totalWeight += weight;
        stats.activeRatingsCount++;
        stats.totalRatingsCount++;
        stats.totalStaked += stake;
    }
    
    // Helper function to remove from model stats (cleaned up signature)
    function _removeFromModelStats(bytes32 modelId, uint8 score, uint256 weight) internal {
        ModelStats storage stats = modelStats[modelId];
        stats.totalWeightedScore -= score * weight;
        stats.totalWeight -= weight;
        stats.activeRatingsCount--;
        // Note: Stake tracking is handled separately to maintain accounting integrity
    }
    
    function slashRating(string calldata slug, uint256 ratingIndex) external onlyOwner {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        require(ratingIndex < modelRatings[modelId].length, "Invalid index");
        
        Rating storage rating = modelRatings[modelId][ratingIndex];
        require(!rating.slashed, "Already slashed");
        
        // OPTIMIZED: Remove slashed rating from stats
        _removeFromModelStats(modelId, rating.score, rating.weight);
        
        rating.slashed = true;
        
        // OPTIMIZED: Constant-time trust score recalculation
        _updateTrustScoreIncremental(modelId);
        
        emit RatingSlashed(modelId, ratingIndex, rating.user);
        
        // Note: Stake remains with the contract. If refunds are desired,
        // implement a separate refund mechanism to maintain accounting integrity
    }
    
    // ===== OPTIMIZED VIEW FUNCTIONS =====
    
    function getTrustScore(string calldata slug) external view returns (uint256) {
        return modelTrustScores[keccak256(abi.encodePacked(slug))];
    }
    function _getTrustScore(string memory slug) internal view returns (uint256) {
    return modelTrustScores[keccak256(abi.encodePacked(slug))];
}

    
    // DEPRECATED: Use getRatingsRange for large datasets to avoid gas issues
    // Frontend should paginate with getRatingsRange instead of calling this
    function getModelRatings(string calldata slug) external view returns (Rating[] memory) {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        Rating[] memory ratings = modelRatings[modelId];
        require(ratings.length <= 50, "Dataset too large, use getRatingsRange for pagination");
        return ratings;
    }
    
    function getRatingCount(string calldata slug) external view returns (uint256) {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        return modelStats[modelId].totalRatingsCount;
    }
    
    function getActiveRatingCount(string calldata slug) external view returns (uint256) {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        return modelStats[modelId].activeRatingsCount;
    }
    
    // OPTIMIZED: O(1) lookup instead of O(n) search
    function getUserRating(string calldata slug, address user) 
        external view returns (bool found, Rating memory rating) 
    {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        
        if (!hasRated[modelId][user]) {
            return (false, Rating(address(0), 0, bytes32(0), 0, 0, false, 0));
        }
        
        uint256 index = userRatingIndex[modelId][user];
        Rating memory userRating = modelRatings[modelId][index];
        
        if (userRating.slashed) {
            return (false, Rating(address(0), 0, bytes32(0), 0, 0, false, 0));
        }
        
        return (true, userRating);
    }
    
    function getRatingByIndex(string calldata slug, uint256 index) external view returns (Rating memory) {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        require(index < modelRatings[modelId].length, "Index out of bounds");
        return modelRatings[modelId][index];
    }
    
    function getRatingsRange(string calldata slug, uint256 start, uint256 end) 
        external view returns (Rating[] memory) 
    {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        uint256 total = modelRatings[modelId].length;
        
        if (end > total) end = total;
        if (start >= end) return new Rating[](0);
        
        Rating[] memory result = new Rating[](end - start);
        for (uint i = start; i < end; i++) {
            result[i - start] = modelRatings[modelId][i];
        }
        return result;
    }
    
    // SUPER OPTIMIZED: All stats in O(1) using pre-computed values
    function getModelStats(string calldata slug) external view returns (
        uint256 trustScore,
        uint256 totalRatings,
        uint256 activeRatings,
        uint256 averageScore,
        uint256 totalStaked
    ) {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        ModelStats storage stats = modelStats[modelId];
        
        trustScore = modelTrustScores[modelId];
        totalRatings = stats.totalRatingsCount;
        activeRatings = stats.activeRatingsCount;
        totalStaked = stats.totalStaked;
        
        // Calculate average score from pre-computed totals (20-100 scale where 100 = 5 stars)
        if (activeRatings > 0 && stats.totalWeight > 0) {
            averageScore = (stats.totalWeightedScore * 20) / stats.totalWeight;
        } else {
            averageScore = 0;
        }
    }
    
    // NEW: Get model stats struct directly (gas efficient for external calls)
    function getModelStatsStruct(string calldata slug) external view returns (ModelStats memory) {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        return modelStats[modelId];
    }
    
    // ===== UTILITY FUNCTIONS =====
    
    // Simple square root approximation with reputation cap to prevent excessive weights
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        if (x == 1) return 1;
        
        // Cap reputation at MAX_REPUTATION_WEIGHT to prevent excessive weight concentration
        if (x > MAX_REPUTATION_WEIGHT) x = MAX_REPUTATION_WEIGHT;
        
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    // Emergency functions for contract management
    function withdrawStuckAVAX() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No AVAX to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "AVAX withdrawal failed");
    }
    
    // Emergency pause/unpause functions
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // ===== EMERGENCY FUNCTIONS =====
    
    // Function to recalculate all stats (emergency use only)
    
    // Allow owner to update max stake (for market conditions)
    function updateMaxStake(uint256 newMaxStake) external onlyOwner {
        require(newMaxStake > 0, "Max stake must be positive");
        require(newMaxStake <= 10 ether, "Unreasonably high max stake"); // Max 10 AVAX
        
        uint256 oldMaxStake = MAX_STAKE_PER_RATING;
        MAX_STAKE_PER_RATING = newMaxStake;
        
        emit MaxStakeUpdated(oldMaxStake, newMaxStake);
    }
    
    event MaxStakeUpdated(uint256 oldMaxStake, uint256 newMaxStake);
    
    // Get current configuration
    function getConfiguration() external view returns (
        uint256 maxStakePerRating,
        uint256 maxReputationWeight,
        uint256 chunkSize
    ) {
        return (MAX_STAKE_PER_RATING, MAX_REPUTATION_WEIGHT, CHUNK_SIZE);
    }
    
    // ===== FRONTEND HELPER FUNCTIONS =====
    
    // Convert trust score from 20-100 scale to 1-5 star scale for frontend
    function getTrustScoreNormalized(string calldata slug) external view returns (uint256 starsOutOf5) {
        uint256 score = _getTrustScore(slug);
        // Convert 20-100 scale to 1-5: (score - 20) / 16 + 1, but handle edge cases
        if (score == 0) return 0; // No ratings
        if (score < 20) return 1;  // Minimum 1 star for any rating
        return ((score - 20) / 16) + 1; // 20->1, 36->2, 52->3, 68->4, 84+->5
    }
    
    // Get model stats with normalized scores for frontend
    function getModelStatsNormalized(string calldata slug) external view returns (
        uint256 trustScoreStars, // 0-5 scale
        uint256 totalRatings,
        uint256 activeRatings,
        uint256 averageScoreStars, // 1-5 scale
        uint256 totalStaked
    ) {
        (uint256 trustScore, uint256 totalRats, uint256 activeRats, uint256 avgScore, uint256 staked) = 
            this.getModelStats(slug);
        
        // Convert to star ratings
        trustScoreStars = trustScore == 0 ? 0 : ((trustScore - 20) / 16) + 1;
        if (trustScoreStars > 5) trustScoreStars = 5;
        
        averageScoreStars = avgScore == 0 ? 0 : ((avgScore - 20) / 16) + 1;
        if (averageScoreStars > 5) averageScoreStars = 5;
        
        return (trustScoreStars, totalRats, activeRats, averageScoreStars, staked);
    }
    function recalculateModelStats(string calldata slug) external onlyOwner {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        Rating[] storage ratings = modelRatings[modelId];
        
        // Reset stats
        delete modelStats[modelId];
        
        // Recalculate from scratch
        for (uint i = 0; i < ratings.length; i++) {
            Rating storage rating = ratings[i];
            if (!rating.slashed) {
                modelStats[modelId].totalWeightedScore += rating.score * rating.weight;
                modelStats[modelId].totalWeight += rating.weight;
                modelStats[modelId].activeRatingsCount++;
            }
            modelStats[modelId].totalRatingsCount++;
            modelStats[modelId].totalStaked += rating.stake;
        }
        
        _updateTrustScoreIncremental(modelId);
    }
    
    // ===== PULL-BASED REFUND SYSTEM FOR GAS SAFETY =====
    
    mapping(bytes32 => mapping(uint256 => bool)) public refundMarked;    // Owner marked for refund
    mapping(bytes32 => mapping(uint256 => bool)) public refundClaimed;   // User actually claimed
    
    event RefundAvailable(bytes32 indexed modelId, uint256 indexed ratingIndex, address indexed user, uint256 amount);
    event RefundClaimed(bytes32 indexed modelId, uint256 indexed ratingIndex, address indexed user, uint256 amount);
    
    // Mark slashed ratings as refundable (owner function) - prevents duplicate marking
    function markRefundable(string calldata slug, uint256[] calldata ratingIndices) external onlyOwner {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        
        for (uint i = 0; i < ratingIndices.length; i++) {
            uint256 index = ratingIndices[i];
            require(index < modelRatings[modelId].length, "Invalid index");
            
            Rating storage rating = modelRatings[modelId][index];
            require(rating.slashed, "Rating not slashed");
            require(!refundMarked[modelId][index], "Already marked for refund");
            require(rating.stake > 0, "No stake to refund");
            
            // Mark as available for refund
            refundMarked[modelId][index] = true;
            
            emit RefundAvailable(modelId, index, rating.user, rating.stake);
        }
    }
    
    // Users can claim their own refunds (pull-based)
    function claimRefund(string calldata slug, uint256 ratingIndex) external nonReentrant {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        require(ratingIndex < modelRatings[modelId].length, "Invalid index");
        
        Rating storage rating = modelRatings[modelId][ratingIndex];
        require(rating.slashed, "Rating not slashed");
        require(rating.user == msg.sender, "Not your rating");
        require(refundMarked[modelId][ratingIndex], "Not marked for refund by owner");
        require(!refundClaimed[modelId][ratingIndex], "Already claimed");
        require(rating.stake > 0, "No stake to refund");
        
        uint256 refundAmount = rating.stake;
        
        // Update accounting
        refundClaimed[modelId][ratingIndex] = true;
        rating.stake = 0;
        modelStats[modelId].totalStaked -= refundAmount;
        users[msg.sender].totalStaked -= refundAmount;
        
        // Refund using call for gas safety
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund failed");
        
        emit RefundClaimed(modelId, ratingIndex, msg.sender, refundAmount);
    }
    
    // CHUNKED VERSION: Get pending refunds in chunks to avoid gas limits
    function getPendingRefundsChunked(string calldata slug, address user, uint256 startIndex, uint256 maxResults) 
        external view returns (
            uint256[] memory indices, 
            uint256[] memory amounts,
            uint256 totalAmount,
            bool hasMore
        ) {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        Rating[] memory ratings = modelRatings[modelId];
        
        uint256 endIndex = startIndex + maxResults;
        if (endIndex > ratings.length) {
            endIndex = ratings.length;
            hasMore = false;
        } else {
            hasMore = true;
        }
        
        // Count eligible refunds in this chunk
        uint256 count = 0;
        uint256 total = 0;
        for (uint i = startIndex; i < endIndex; i++) {
            if (ratings[i].user == user && ratings[i].slashed && 
                ratings[i].stake > 0 && refundMarked[modelId][i] && !refundClaimed[modelId][i]) {
                count++;
                total += ratings[i].stake;
            }
        }
        
        // Build result arrays
        indices = new uint256[](count);
        amounts = new uint256[](count);
        uint256 j = 0;
        for (uint i = startIndex; i < endIndex; i++) {
            if (ratings[i].user == user && ratings[i].slashed && 
                ratings[i].stake > 0 && refundMarked[modelId][i] && !refundClaimed[modelId][i]) {
                indices[j] = i;
                amounts[j] = ratings[i].stake;
                j++;
            }
        }
        
        return (indices, amounts, total, hasMore);
    }
    
    // LEGACY: Keep original function for small datasets
    function getPendingRefunds(string calldata slug, address user) external view returns (uint256[] memory indices, uint256 totalAmount) {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        Rating[] memory ratings = modelRatings[modelId];
        
        require(ratings.length <= CHUNK_SIZE, "Dataset too large, use getPendingRefundsChunked");
        
        // Count eligible refunds first
        uint256 count = 0;
        uint256 total = 0;
        for (uint i = 0; i < ratings.length; i++) {
            if (ratings[i].user == user && ratings[i].slashed && 
                ratings[i].stake > 0 && refundMarked[modelId][i] && !refundClaimed[modelId][i]) {
                count++;
                total += ratings[i].stake;
            }
        }
        
        // Build result arrays
        indices = new uint256[](count);
        uint256 j = 0;
        for (uint i = 0; i < ratings.length; i++) {
            if (ratings[i].user == user && ratings[i].slashed && 
                ratings[i].stake > 0 && refundMarked[modelId][i] && !refundClaimed[modelId][i]) {
                indices[j] = i;
                j++;
            }
        }
        
        return (indices, total);
    }
    
    // WARNING: This function loops through all ratings - use for off-chain aggregation only!
    // For on-chain operations, use pull-based refund system instead
    function getSlashedStakeAmount(string calldata slug) external view returns (uint256 totalSlashedStake) {
        bytes32 modelId = keccak256(abi.encodePacked(slug));
        Rating[] memory ratings = modelRatings[modelId];
        
        // This can be gas-heavy for models with many ratings
        // Recommended for off-chain queries only
        for (uint i = 0; i < ratings.length; i++) {
            if (ratings[i].slashed && refundMarked[modelId][i] && !refundClaimed[modelId][i]) {
                totalSlashedStake += ratings[i].stake;
            }
        }
    }
}
