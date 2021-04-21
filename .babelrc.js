const dependencies = require("./package").dependencies || {};

const NODE_ENV = process.env.NODE_ENV || "development";
const __PROD__ = NODE_ENV === "production";
const __TEST__ = NODE_ENV === "test";

module.exports = {
  comments: !__PROD__,
  ignore: __TEST__ ? undefined : [/\.spec\.js$/],
  presets: [
    [
      "@babel/env",
      {
        debug: !__TEST__,
        loose: true,
        shippedProposals: true,
        targets: __PROD__
          ? {
              browsers: ">2%",
              node: "4",
            }
          : { node: "current" },
        useBuiltIns: "@babel/polyfill" in dependencies && "usage",
      },
    ],
  ],
};
