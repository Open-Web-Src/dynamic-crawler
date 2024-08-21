#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ECRStack } from "../lib/constructs/ecr.construct";

const app = new cdk.App();

new ECRStack(app, "ECRStack");

app.synth();
