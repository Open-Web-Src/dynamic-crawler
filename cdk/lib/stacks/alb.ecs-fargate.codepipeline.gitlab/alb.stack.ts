import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {
  AlbConstruct,
  VpcConstruct,
  SecurityGroupConstruct,
  EcsFargateConstruct,
} from "@constructs";

interface AlbStackProps extends cdk.StackProps {
  vpc: VpcConstruct;
  albSecurityGroup: SecurityGroupConstruct;
  reactappService: EcsFargateConstruct;
  certificateArn?: string;
}

export class AlbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AlbStackProps) {
    super(scope, id, props);

    const alb = new AlbConstruct(this, "AlbConstruct", {
      vpc: props.vpc.vpc,
      securityGroup: props.albSecurityGroup.securityGroup,
    });

    // HTTPS Listener (port 443)
    if (props.certificateArn) {
      // HTTP Listener (port 80) for Redirection to HTTPS
      alb.addListener(
        "HTTPListener",
        80,
        80,
        80,
        [],
        elbv2.ApplicationProtocol.HTTP
      );

      alb.addListener(
        "HTTPSListener",
        443, // Incoming HTTPS request port
        80, // Target group port (forwarding to container port)
        80, // Container port inside the ECS service
        [props.reactappService.service],
        elbv2.ApplicationProtocol.HTTPS,
        props.certificateArn
      );
    } else {
      // HTTP Listener (port 80)
      alb.addListener("HttpListener", 80, 80, 80, [
        props.reactappService.service,
      ]);
    }
  }
}
