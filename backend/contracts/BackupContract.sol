// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BackupContract {
    struct Backup {
        string ipfsCid;
        uint256 timestamp;
    }
    
    mapping(address => Backup[]) public userBackups;
    mapping(address => uint256) public latestBackupIndex;
    
    event BackupStored(address indexed user, string ipfsCid, uint256 timestamp);
    
    function storeBackup(string memory _ipfsCid) public {
        uint256 timestamp = block.timestamp;
        userBackups[msg.sender].push(Backup(_ipfsCid, timestamp));
        latestBackupIndex[msg.sender] = userBackups[msg.sender].length - 1;
        
        emit BackupStored(msg.sender, _ipfsCid, timestamp);
    }
    
    function getLatestBackupFor(address user) public view returns (string memory ipfsCid, uint256 timestamp) {
        require(userBackups[user].length > 0, "No backups found");
        
        uint256 index = latestBackupIndex[user];
        Backup memory backup = userBackups[user][index];
        
        return (backup.ipfsCid, backup.timestamp);
    }
    
    function getLatestBackup() public view returns (string memory ipfsCid, uint256 timestamp) {
        return getLatestBackupFor(msg.sender);
    }
    
    function getAllBackupsFor(address user) public view returns (Backup[] memory) {
        return userBackups[user];
    }
    
    function getAllBackups() public view returns (Backup[] memory) {
        return userBackups[msg.sender];
    }
}