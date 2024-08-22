#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { VpcConstruct } from "@constructs";

class VpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new VpcConstruct(this, "VpcConstruct", {
      maxAzs: 3, // Specify the number of availability zones
      subnetConfiguration: [
        {
          cidrMask: 24, // Define the size of the subnet
          name: "Public",
          subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "Private",
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });
  }
}

const app = new cdk.App();
new VpcStack(app, "VpcStack");

app.synth();
