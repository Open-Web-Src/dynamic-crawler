import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

interface VpcConstructProps {
  maxAzs: number;
  subnetConfiguration: ec2.SubnetConfiguration[];
}

export class VpcConstruct extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcConstructProps) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, "MyVpc", {
      maxAzs: props.maxAzs,
      subnetConfiguration: props.subnetConfiguration,
    });
  }
}
