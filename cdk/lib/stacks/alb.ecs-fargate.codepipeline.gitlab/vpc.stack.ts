import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { VpcConstruct } from "@constructs";

export class VpcStack extends cdk.Stack {
  public readonly vpc: VpcConstruct;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new VpcConstruct(this, "VpcConstruct", {
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
  }
}
