// bin/main.ts
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MainStack } from "@stacks/alb.ecs-fargate.codepipeline.gitlab/main.stack";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = new cdk.App();

new MainStack(app, "MainStack");

app.synth();

// import "source-map-support/register";
// import * as cdk from "aws-cdk-lib";
// import { ECRStack } from "../lib/constructs/ecr.construct";
// import { VPCStack } from "../lib/vpc-stack";
// import { SecurityGroupsStack } from "../lib/sg-stack";
// import { ECSClusterStack } from "../lib/ecs-cluster-stack";
// import { ALBStack } from "../lib/alb-stack";
// import { PipelineStack } from "../lib/pipeline-stack";
// import { EC2Stack } from "../lib/ec2-stack";
// import * as dotenv from "dotenv";

// // Load environment variables from .env file
// dotenv.config();

// const app = new cdk.App();

// // Must be run first, then run the initialize script
// const ecrStack = new ECRStack(app, "ECRStack");
// const vpcStack = new VPCStack(app, "VPCStack");
// const sgStack = new SecurityGroupsStack(app, "SGStack", { vpc: vpcStack.vpc });

// const ecsClusterStack = new ECSClusterStack(app, "ECSClusterStack", {
//   vpc: vpcStack.vpc,
//   albSecurityGroup: sgStack.albSecurityGroup,
//   reactappSecurityGroup: sgStack.reactappSecurityGroup,
//   flaskappSecurityGroup: sgStack.flaskappSecurityGroup,
//   crawlerSecurityGroup: sgStack.crawlerSecurityGroup,
//   redisSecurityGroup: sgStack.redisSecurityGroup,
//   seleniumSecurityGroup: sgStack.seleniumSecurityGroup,
//   ecrRepos: {
//     crawler: ecrStack.crawlerRepo,
//     flaskapp: ecrStack.flaskappRepo,
//     reactapp: ecrStack.reactappRepo,
//   },
// });

// const albStack = new ALBStack(app, "ALBStack", {
//   vpc: vpcStack.vpc,
//   albSecurityGroup: sgStack.albSecurityGroup,
//   reactappService: ecsClusterStack.reactappService,
// });

// const pipelineStack = new PipelineStack(app, "PipelineStack", {
//   services: {
//     crawlerMain: ecsClusterStack.crawlerMainService,
//     crawlerReplica: ecsClusterStack.crawlerReplicaService,
//     flaskapp: ecsClusterStack.flaskappService,
//     reactapp: ecsClusterStack.reactappService,
//     redis: ecsClusterStack.redisService,
//     selenium: ecsClusterStack.seleniumService,
//   },
//   sourceBucketName: process.env.SOURCE_BUCKET_NAME!,
// });

// // Ensure the GitLabRunnerStack is created after the VPCStack
// const ec2Stack = new EC2Stack(app, "GitLabRunnerStack", {
//   vpc: vpcStack.vpc,
//   securityGroup: sgStack.gitlabRunnerSecurityGroup, // Assuming this SG is appropriate for the runner
//   keyName: process.env.GITLAB_RUNNER_SSH_KEYNAME!,
// });

// app.synth();
