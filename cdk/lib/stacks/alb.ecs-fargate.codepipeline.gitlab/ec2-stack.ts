import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { VpcConstruct } from "../constructs/vpc-construct";
import { SecurityGroupConstruct } from "../constructs/security-group-construct";
import { Ec2Construct } from "../constructs/ec2-construct";

export class Ec2Stack extends cdk.Stack {
  public readonly instance: Ec2Construct;

  constructor(
    scope: Construct,
    id: string,
    props: {
      vpc: VpcConstruct;
      securityGroup: SecurityGroupConstruct;
      keyName: string;
      userData: cdk.aws_ec2.UserData;
    } & cdk.StackProps
  ) {
    super(scope, id, props);

    this.instance = new Ec2Construct(this, "Ec2Construct", {
      vpc: props.vpc.vpc,
      securityGroup: props.securityGroup.securityGroup,
      keyName: props.keyName,
      userData: props.userData,
    });
  }
}
