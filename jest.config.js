const config = {
    preset: "jest-puppeteer",
    testEnvironment: "jest-environment-puppeteer",
    setupFilesAfterEnv: ["./jest.setup.js"],
    /*"collectCoverage": true,
    "collectCoverageFrom": [
      "./"
    ],
    "coverageReporters": [
    ],*/
    /*"setupFilesAfterEnv": [
      "jest-puppeteer-istanbul/lib/setup"
    ],
    "reporters": [
      "default",
      "jest-puppeteer-istanbul/lib/reporter"
    ],
    "coverageDirectory": "coverage"*/
};
module.exports = config;
