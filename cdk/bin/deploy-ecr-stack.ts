#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { EcrStack } from "@stacks/alb.ecs-fargate.codepipeline.gitlab/ecr.stack";

const app = new cdk.App();

new EcrStack(app, "EcrStack");

app.synth();
