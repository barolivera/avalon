// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IIdentityRegistry, IReputationRegistry} from "../interfaces/IERC8004.sol";

/// @title MockIdentityRegistry - Mock ERC-8004 Identity Registry for testing
/// @dev NOT for production. Simulates the deployed singleton on Fuji.
contract MockIdentityRegistry is IIdentityRegistry {
    uint256 private _nextAgentId = 1;
    mapping(uint256 => address) private _owners;
    mapping(uint256 => address) private _wallets;
    mapping(uint256 => string) private _uris;

    function register(string calldata agentURI, MetadataEntry[] calldata) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _owners[agentId] = msg.sender;
        _uris[agentId] = agentURI;
        emit Registered(agentId, agentURI, msg.sender);
    }

    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _owners[agentId] = msg.sender;
        _uris[agentId] = agentURI;
        emit Registered(agentId, agentURI, msg.sender);
    }

    function register() external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _owners[agentId] = msg.sender;
        emit Registered(agentId, "", msg.sender);
    }

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        _uris[agentId] = newURI;
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    function getMetadata(uint256, string memory) external pure returns (bytes memory) {
        return "";
    }

    function setMetadata(uint256, string memory, bytes memory) external {}

    function setAgentWallet(uint256 agentId, address newWallet, uint256, bytes calldata) external {
        _wallets[agentId] = newWallet;
        emit AgentWalletSet(agentId, newWallet);
    }

    /// @dev Simplified: set wallet directly (test helper)
    function setAgentWalletDirect(uint256 agentId, address wallet) external {
        _wallets[agentId] = wallet;
        emit AgentWalletSet(agentId, wallet);
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        return _wallets[agentId];
    }

    function unsetAgentWallet(uint256 agentId) external {
        delete _wallets[agentId];
    }

    function isAuthorized(uint256 agentId, address caller) external view returns (bool) {
        return _owners[agentId] == caller;
    }

    function ownerOf(uint256 agentId) external view returns (address) {
        require(_owners[agentId] != address(0), "Agent does not exist");
        return _owners[agentId];
    }
}

/// @title MockReputationRegistry - Mock ERC-8004 Reputation Registry for testing
contract MockReputationRegistry is IReputationRegistry {
    struct Feedback {
        int128 value;
        uint8 decimals;
        string tag1;
        bool exists;
    }

    mapping(uint256 => mapping(address => mapping(uint64 => Feedback))) private _feedback;
    mapping(uint256 => mapping(address => uint64)) private _lastIndex;
    mapping(uint256 => address[]) private _clients;

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        uint64 idx = ++_lastIndex[agentId][msg.sender];
        _feedback[agentId][msg.sender][idx] = Feedback(value, valueDecimals, tag1, true);

        if (_lastIndex[agentId][msg.sender] == 1) {
            _clients[agentId].push(msg.sender);
        }

        // Avoid stack-too-deep by breaking into local vars
        {
            emit NewFeedback(agentId, msg.sender, idx, value, valueDecimals, tag1, tag1, tag2, endpoint, feedbackURI, feedbackHash);
        }
    }

    function revokeFeedback(uint256, uint64) external {}

    function getSummary(uint256 agentId, address[] calldata, string calldata, string calldata)
        external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
    {
        summaryValueDecimals = 18;
        address[] storage clients = _clients[agentId];
        int256 total = 0;

        for (uint256 i = 0; i < clients.length; i++) {
            uint64 lastIdx = _lastIndex[agentId][clients[i]];
            for (uint64 j = 1; j <= lastIdx; j++) {
                Feedback storage f = _feedback[agentId][clients[i]][j];
                if (f.exists) {
                    total += int256(f.value) * int256(10 ** (18 - f.decimals));
                    count++;
                }
            }
        }

        if (count > 0) {
            summaryValue = int128(total / int256(uint256(count)));
        }
    }

    function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex)
        external view returns (int128, uint8, string memory, string memory, bool)
    {
        Feedback storage f = _feedback[agentId][clientAddress][feedbackIndex];
        return (f.value, f.decimals, f.tag1, "", false);
    }

    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
        return _lastIndex[agentId][clientAddress];
    }
}
