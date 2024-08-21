import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { SsmConstruct } from "./ssm.contruct";

interface EcrConstructProps {
  repositoryName: string;
  ssmParameterName: string;
}

export class EcrConstruct extends Construct {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcrConstructProps) {
    super(scope, id);

    this.repository = new ecr.Repository(this, "Repository", {
      repositoryName: props.repositoryName,
    });

    new SsmConstruct(this, "EcrUriParameter", {
      parameterName: props.ssmParameterName,
      stringValue: this.repository.repositoryUri,
    });
  }
}
