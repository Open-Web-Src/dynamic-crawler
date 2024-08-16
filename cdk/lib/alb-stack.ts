import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

interface ALBStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  albSecurityGroup: ec2.SecurityGroup;
  reactappService: ecs.FargateService;
}

export class ALBStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ALBStackProps) {
    super(scope, id, props);

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, "MyALB", {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: props.albSecurityGroup,
    });

    const listener = loadBalancer.addListener("Listener", {
      port: 80,
      open: true,
    });

    // Add target group for the frontend (React app)
    listener.addTargets("ReactAppTarget", {
      port: 80,
      targets: [
        props.reactappService.loadBalancerTarget({
          containerName: process.env.REACTAPP_CONTAINER_NAME!,
          containerPort: 80,
        }),
      ],
    });
  }
}
