console.log("Truffle config is loading...");

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,  // Default Ganache port
      network_id: "*", // Match any network ID
    },
  },
  compilers: {
    solc: {
      version: "0.8.0", // Use the correct Solidity version
      settings: {
        optimizer: {
          enabled: true, // Enable the optimizer
          runs: 200,     // Optimize for 200 runs
        },
      },
    },
  },
};