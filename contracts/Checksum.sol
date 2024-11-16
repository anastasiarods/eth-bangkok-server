// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Verifier {
    // Mapping from checksum to wallet address
    mapping(bytes32 => address) public checksumOwner;
    
    // Mapping from wallet address to array of their checksums
    mapping(address => bytes32[]) public ownerChecksums;
    
    // Event for logging new checksum recordings
    event ChecksumRecorded(bytes32 indexed checksum, address indexed owner);
    
    /**
     * @dev Records a new checksum associated with the sender's address
     * @param checksum Hash of the transcript content
     */
    function recordChecksum(bytes32 checksum) external {
        require(checksumOwner[checksum] == address(0), "Checksum already exists");
        
        checksumOwner[checksum] = msg.sender;
        ownerChecksums[msg.sender].push(checksum);
        
        emit ChecksumRecorded(checksum, msg.sender);
    }
    
    /**
     * @dev Verifies if a checksum has been recorded and returns its owner
     * @param checksum The checksum to verify
     * @return bool Whether the checksum exists
     * @return address The wallet address that recorded the checksum
     */
    function verifyChecksum(bytes32 checksum) external view returns (bool, address) {
        address owner = checksumOwner[checksum];
        return (owner != address(0), owner);
    }
    
    /**
     * @dev Gets all checksums recorded by a specific address
     * @param owner The wallet address to query
     * @return bytes32[] Array of checksums recorded by this address
     */
    function getChecksumsByOwner(address owner) external view returns (bytes32[] memory) {
        return ownerChecksums[owner];
    }
    
    /**
     * @dev Gets the number of checksums recorded by a specific address
     * @param owner The wallet address to query
     * @return uint256 Number of checksums recorded by this address
     */
    function getChecksumsCount(address owner) external view returns (uint256) {
        return ownerChecksums[owner].length;
    }
}