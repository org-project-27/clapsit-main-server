// This is for PM2 deployments don't touch it!
module.exports = {
  apps: [
    {
      name: "clapsit-main-server",
      script: "npm",
      args: "run deploy",
      autorestart: true,
      watch: false,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
