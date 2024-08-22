#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { VpcConstruct } from "@constructs";

const app = new cdk.App();

new VpcConstruct(app, "VpcConstruct", {
  maxAzs: 3,
  subnetConfiguration: [
    {
      name: "Public",
      subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
    },
    {
      name: "Private",
      subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
    },
  ],
});

app.synth();
