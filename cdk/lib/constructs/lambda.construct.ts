import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface LambdaConstructProps {
  ecsClusterName: string;
  ecsServiceName: string;
}

export class LambdaConstruct extends Construct {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    this.function = new lambda.Function(this, "ScalingLambda", {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
          const AWS = require('aws-sdk');
          const ecs = new AWS.ECS();
  
          exports.handler = async function(event) {
              const params = {
                  service: '${props.ecsServiceName}',
                  cluster: '${props.ecsClusterName}',
                  desiredCount: event.desiredCount,
              };
  
              await ecs.updateService(params).promise();
              return;
          };
        `),
      environment: {
        ECS_CLUSTER_NAME: props.ecsClusterName,
        ECS_SERVICE_NAME: props.ecsServiceName,
      },
    });

    // Allow the Lambda to update ECS services
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ecs:UpdateService"],
        resources: ["*"], // Use specific ARNs in production
      })
    );
  }
}
