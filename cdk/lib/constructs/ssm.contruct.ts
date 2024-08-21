import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";

interface SsmProps {
  parameterName: string;
  stringValue: string;
}

export class SsmConstruct extends Construct {
  constructor(scope: Construct, id: string, props: SsmProps) {
    super(scope, id);

    new ssm.StringParameter(this, "Parameter", {
      parameterName: props.parameterName,
      stringValue: props.stringValue,
    });
  }
}
