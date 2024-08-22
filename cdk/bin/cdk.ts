#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MainStack } from "@stacks/alb.ecs-fargate.codepipeline.gitlab/main.stack";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = new cdk.App();

new MainStack(app, "MainStack");

app.synth();
