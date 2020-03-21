/**
 * Created by Riyaz on 2/29/20
 */

const jsonServer = require('json-server'),
    fs = require('fs'),
    pathAPI = require('path'),
    https = require('https'),
    glob = require("glob");

function MockDataManager(mockAPIConfigs) {
    if (!MockDataManager.getInstance()) {
        this.config = mockAPIConfigs;
        this.defaultMockDataSetPath = pathAPI.resolve(__dirname, mockAPIConfigs.defaultMockDataPath);
        this.featureDataSetPath = pathAPI.resolve(__dirname, mockAPIConfigs.featureMockDataPath);
        this.baseUrlPath = mockAPIConfigs.baseUrlPath || "/backend";
        this.mockDataRootDir = pathAPI.basename(this.defaultMockDataSetPath);
        this.featureMockDataRootDir = pathAPI.basename(this.featureDataSetPath);
        this.routesWithoutJsonExt = (mockAPIConfigs.ignoreJsonExtension && Array.isArray(mockAPIConfigs.ignoreJsonExtension) && mockAPIConfigs.ignoreJsonExtension) || [];
        this.featureList = (mockAPIConfigs.useTheseFeatureMocks && Array.isArray(mockAPIConfigs.useTheseFeatureMocks) && mockAPIConfigs.useTheseFeatureMocks) || [];
        (mockAPIConfigs.ignoreQueryStringParameter &&
            typeof mockAPIConfigs.ignoreQueryStringParameter === "object" &&
            (this.ignoreQueryString = Object.keys(mockAPIConfigs.ignoreQueryStringParameter),
                this.QrSpecs = mockAPIConfigs.ignoreQueryStringParameter)
        );
        MockDataManager._setInstance(this);
    }
    return MockDataManager.getInstance();
}

MockDataManager._instance;
MockDataManager._setInstance = function (instance) {
    MockDataManager._instance = instance;
};
MockDataManager.getInstance = function () {
    return MockDataManager._instance;
}


MockDataManager.prototype = {
    featureMocksPaths: [],
    matches: [],
    db: {},
    ignoreQueryString: [],
    QrSpecs: {},
    flatNestedPath: [], // will hold processed flat nested paths to
                        // avoid processing again during unique paths

    getDirectories(src, callback) {
        glob(src + '/**/*.json', callback);
    },

    initApiSimulator: function () {
        this.getDirectories(this.featureDataSetPath, (err, res) => {
            this.fetchFeatureMockFiles(err, res);
            this.getDirectories(this.defaultMockDataSetPath, this.processAndCreateMockRoutes.bind(this));
        });
    },

    fetchFeatureMockFiles: function (err, res) {
        if (err) {
            console.log('Error', err);
        } else {
            this.featureMocksPaths = res.slice(0);
        }
    },

    processAndCreateMockRoutes: function (defErr, defRes) {
        if (defErr) {
            console.log('Error', defErr);
        } else {
            this.server = jsonServer.create();//Json Mock server app
            this.middlewares = jsonServer.defaults();
            this.server.use(this.middlewares);

            this.setupApiHandlers();

            this.updateDBRoutesFromMockFiles(this.extractNestedPaths(defRes), true);
            this.updateDBRoutesFromMockFiles(defRes);

            if (this.featureList.length) {
                this.updateDBRoutesFromMockFiles(this.extractNestedPaths(defRes, true), true, true);
            }
            if (this.featureList.length) {
                this.updateDBRoutesFromMockFiles(this.featureMocksPaths, false, true);
            }

            this.server.use(this.baseUrlPath, jsonServer.router(this.db));//registering mock rountes

            this.launchHttpsServer();
        }
    },

    setupApiHandlers: function () {
        this.server.use(jsonServer.bodyParser);
        this.server.use(function (req, res, next) {
            if (req.method === 'POST' || req.method === 'PUT') {//typical restful service will add/update data through POST/PUT method,
                // jsonserver also follow the same, so we internally change the methode
                // to GET to fetch the router data back
                // Converts POST to GET and move payload to query params
                // This way it will make JSON Server that it's GET request
                req.method = 'GET';
                req.query = req.body;
            } else if (req.method === "GET") {
                if (req.url.indexOf("?") >= 0) {
                    let pathStr = req.url.split("?").shift();
                    if (this.ignoreQueryString.indexOf(pathStr) >= 0) {
                        let foundQrSpecs = this.QrSpecs[pathStr] || false;
                        for (let qr in req.query) {
                            if (req.query.hasOwnProperty(qr)) {
                                if (foundQrSpecs) {
                                    if (foundQrSpecs.hasOwnProperty(qr) && foundQrSpecs[qr] === "") {
                                        delete req.query[qr];
                                    } else if (foundQrSpecs[qr]) {
                                        req.query[qr] = foundQrSpecs[qr];
                                    }
                                } else {
                                    delete req.query[qr];
                                }
                            }
                        }
                    }
                }
            }
            // Continue to JSON Server router
            next()
        })
    },

    /**
     * check any feature specific mock data configured through config file.
     * if feature list configured in mockApi.config->useTheseFeatureMocks,
     * the default mock data will be overwritten by first matched feature specific mock data.
     * this function will find that feature specific mock data path and remove that from featureMockPaths array to process the unmatched feature paths
     */
    fetchAndRemoveFeatureSpecificMock: function (defaultMockPath) {
        let firstMatchedFeatureMock;
        for (let i = 0; i < this.featureList.length; i++) {
            let featurePathInd = this.featureMocksPaths.indexOf(defaultMockPath.replace(this.mockDataRootDir, this.featureMockDataRootDir + '/' + this.featureList[i]));
            if (featurePathInd >= 0) {
                !firstMatchedFeatureMock ? (firstMatchedFeatureMock = this.featureMocksPaths.splice(featurePathInd, 1)[0])
                    : this.featureMocksPaths.splice(featurePathInd, 1);
            }
        }
        return firstMatchedFeatureMock || "";
    },

    /**
     * function to take care of endpoints without .json extension based on config variable "routesWithoutJsonExt"
     * @param routeLeaf => filename from the detected json path
     * @returns string => endpoint path based on config variable "routesWithoutJsonExt"
     */
    validateAndRepJsonExt(routeLeaf) {
        if (this.routesWithoutJsonExt.indexOf(routeLeaf) >= 0) {
            return routeLeaf.replace(".json", "");
        }
        return this.config.apiEndpointExtension ? routeLeaf.replace(".json", this.config.apiEndpointExtension) : routeLeaf;
    },

    checkNextIsSameSibling(nextPath, currentPathParent) {
        let pathArr = nextPath.split("/");
        pathArr.pop();
        return ((nextPath && pathArr.join("/") === currentPathParent)/* || (lastCompletedPath && lastCompletedPath === currentPathParent)*/);
    },

    /**
     * extract parent path of given .json file path
     * @param string path
     * @param boolean forFeature -> flag to process default/feature mock path
     * @returns string => parent path
     */
    parseParentPath(path, forFeature = false) {
        if (path) {
            let pat = new RegExp('\\/' + ((forFeature && this.featureMockDataRootDir + '\/(' + this.featureList.join("|") + ')') || this.mockDataRootDir) + '([\\w\\/\\-]+\\/)\\w+\\.json', "i"),
                pathMatches = path.match(pat),//path.match(/\/MockJsons([\w\/\-]+\/)\w+\.json/i),
                parPath = "";
            if (pathMatches && pathMatches.length >= 2) {
                parPath = pathMatches[forFeature ? 2 : 1];
            }
            return parPath;
        }
        return path;
    },

//function to extract all nested paths
// return obj format would be
// {"path_val_from_<MockApi>": [array_of_files_from_same_parent]}
// {
//  "/alerts/": [
//      '/Users/mmohamm4/workspace/atlantis-ui/MockApi/MockJsons/alerts/alerts_details.json',
//      '/Users/mmohamm4/workspace/atlantis-ui/MockApi/MockJsons/alerts/total_alerts_count.json'
//  ]
// }
    extractNestedPaths(res, forFeature = false) {
        let newPathArr = {},
            extractedPathPositions = [],
            parentPath,
            paths = forFeature ? this.featureMocksPaths/*.slice(0)*/ : res/*.slice(0)*/;
        for (let i = paths.length - 1; i >= 0; i--) {
            parentPath = this.parseParentPath(paths[i], forFeature);
            for (let j = paths.length - 1; j >= 0; j--) {
                if (i !== j) {
                    let parPath = this.parseParentPath(paths[j], forFeature);
                    if (parPath && parentPath && parPath !== "/" && parentPath !== "/" && parPath === parentPath) {
                        if (!newPathArr[parentPath]) newPathArr[parentPath] = [];
                        newPathArr[parentPath].push(paths[i]);
                        newPathArr[parentPath].push(paths[j]);
                        if (extractedPathPositions.indexOf(i) < 0) {
                            extractedPathPositions.push(i);
                        }
                        extractedPathPositions.push(j);
                    }
                }
            }
            if (extractedPathPositions.length) {
                extractedPathPositions.forEach(pathPos => {
                    if (paths[pathPos]) {
                        paths.splice(pathPos, 1);
                    }
                });
                extractedPathPositions.splice(0);
            }
            let len = paths.length - 1;
            if (i > len) {
                i = len;
            }
        }

        if (forFeature) {
            this.featureMocksPaths = paths.slice(0);
        } else {
            res = paths.slice(0);
        }

        return newPathArr;
    },

    updateDBRoutesFromMockFiles(paths, isNested = false, forFeature = false) {
        if (isNested) {
            //process all nested paths
            for (let nPath in paths) {
                if (paths.hasOwnProperty(nPath)) {
                    let nestDataObj = {};
                    paths[nPath].map(path => {
                        let filename = path.replace(/^.*[\/]/, ''),
                            featurePath = (!forFeature && this.fetchAndRemoveFeatureSpecificMock(path)) || "";
                        nestDataObj[this.validateAndRepJsonExt(filename)] = require(featurePath || path);
                    });
                    this.flatNestedPath = this.flatNestedPath.concat(paths[nPath]);//creating flat nested paths to
                    // avoid processing again during unique paths
                    this.server.use(this.baseUrlPath + nPath.substring(0, nPath.length - 1), jsonServer.router(Object.assign({}, nestDataObj)));
                    //delete nestDataObj;
                }
            }
        } else {
            //Process all other path that excluded the files in the same level
            let pat = new RegExp('\\/' + ((forFeature && this.featureMockDataRootDir + '\\/(' + this.featureList.join("|") + ')\\/') || this.mockDataRootDir + "\\/") + '([\\w\\/]+.\\w+)', "i");
            for (let len = paths.length, i = len - 1; i >= 0; i--) {
                let val = paths[i],
                    featurePath = (!forFeature && this.fetchAndRemoveFeatureSpecificMock(val)) || "";
                Array.isArray(this.matches) && this.matches.splice(0);
                this.matches = val.match(pat);
                if (Array.isArray(this.matches) && this.matches.length >= 2) {//handle
                    let paths = this.matches[forFeature ? 2 : 1].split("/"),
                        pathsObj = {}, routePath;
                    if (paths.length > 1) {
                        let leaf = paths.pop(),
                            routeObj = {},
                            mergedPathStr = paths.join("/");
                        routePath = this.baseUrlPath + (mergedPathStr[0] === "/" ? mergedPathStr : "/" + mergedPathStr);
                        if (this.flatNestedPath.indexOf(val) < 0) {
                            routeObj[this.validateAndRepJsonExt(leaf)] = require(featurePath || val);
                        }

                        this.server.use(routePath, jsonServer.router(Object.assign({}, routeObj)));

                    } else {
                        this.db[this.validateAndRepJsonExt(paths[0])] = require(featurePath || val);
                    }

                    /*delete pathsObj;
                    delete routeObj;*/

                }
            }
        }
    },

    launchHttpsServer() {
        let options = {//for https
            key: fs.readFileSync((this.config.sslCertFiles && this.config.sslCertFiles.key) || pathAPI.resolve(__dirname, '../samples/key.pem')),
            cert: fs.readFileSync((this.config.sslCertFiles && this.config.sslCertFiles.cert) || pathAPI.resolve(__dirname, '../samples/cert.pem'))
        };
        https.createServer(options, this.server).listen(3030, function () {
            console.log("api-simulator started on port " + 3030);
        }).on('error', (e) => { //to suppress exception popup from electron app while open one more app instance
            if (e.code === 'EADDRINUSE') {
                console.error('port 3030 already in use');
            }
        });
    }
}

module.exports = MockDataManager;
