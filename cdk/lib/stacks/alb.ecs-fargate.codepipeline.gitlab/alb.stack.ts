import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {
  AlbConstruct,
  SecurityGroupConstruct,
  EcsFargateConstruct,
} from "@constructs";

interface AlbStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  albSecurityGroup: SecurityGroupConstruct;
  reactappService: EcsFargateConstruct;
  certificateArn?: string;
}

export class AlbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AlbStackProps) {
    super(scope, id, props);

    const alb = new AlbConstruct(this, "AlbConstruct", {
      vpc: props.vpc,
      securityGroup: props.albSecurityGroup.securityGroup,
    });

    // HTTPS Listener (port 443)
    if (props.certificateArn) {
      // HTTP Listener (port 80) for Redirection to HTTPS
      alb.addListener("HTTPListener", 80, [], elbv2.ApplicationProtocol.HTTP);

      alb.addListener(
        "HTTPSListener",
        443, // Incoming HTTPS request port
        [
          {
            service: props.reactappService.service,
            containerName: process.env.REACTAPP_CONTAINER_NAME!,
            containerPort: 80,
          },
        ],
        elbv2.ApplicationProtocol.HTTPS,
        undefined,
        props.certificateArn
      );
    } else {
      // HTTP Listener (port 80)
      alb.addListener(
        "HttpListener",
        80,
        [
          {
            service: props.reactappService.service,
            containerName: process.env.REACTAPP_CONTAINER_NAME!,
            containerPort: 80,
          },
        ],
        elbv2.ApplicationProtocol.HTTP
      );
    }
  }
}
