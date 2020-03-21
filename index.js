/**
 * Created by Riyaz on 02/29/2018.
 */
let MockDataManager = require("./src/MockDataManager");
const argv = require('yargs')
    .usage('Usage: $0 --config <config_file_path>')
    .example('$0 --config ./apisimulator.config.js', 'Start the api-simulator using given config options')
    .alias('c', 'config')
    .help('h')
    .alias('h', 'help')
    .argv,
    pathAPI = require('path');

let mockAPIConfigs;

try {
    let resolvedCofigPath = typeof argv.config === "string" ? pathAPI.resolve(argv.config) : "./samples/apisimulator.config";
    mockAPIConfigs = require(resolvedCofigPath);
} catch (e) {
    mockAPIConfigs = {};
}

const mockDataMgr = new MockDataManager(mockAPIConfigs);

mockDataMgr.initApiSimulator();
