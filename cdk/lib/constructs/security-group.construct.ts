import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

interface SecurityGroupConstructProps {
  vpc: ec2.Vpc;
  description: string;
  allowAllOutbound?: boolean;
  ingressRules?: {
    peer: ec2.IPeer;
    connection: ec2.Port;
    description?: string;
  }[];
  securityGroupName?: string;
}

export class SecurityGroupConstruct extends Construct {
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(
    scope: Construct,
    id: string,
    props: SecurityGroupConstructProps
  ) {
    super(scope, id);

    this.securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc: props.vpc,
      description: props.description,
      allowAllOutbound: props.allowAllOutbound ?? true,
      securityGroupName: props.securityGroupName,
    });

    if (props.ingressRules) {
      for (const rule of props.ingressRules) {
        this.securityGroup.addIngressRule(
          rule.peer,
          rule.connection,
          rule.description
        );
      }
    }
  }
}
