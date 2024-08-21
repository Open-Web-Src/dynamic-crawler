import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

interface IamRoleConstructProps {
  assumedBy: iam.ServicePrincipal;
  managedPolicies?: string[];
  roleName?: string;
}

export class IamRoleConstruct extends Construct {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: IamRoleConstructProps) {
    super(scope, id);

    this.role = new iam.Role(this, "IamRole", {
      assumedBy: props.assumedBy,
      managedPolicies: props.managedPolicies?.map((policyName) =>
        iam.ManagedPolicy.fromAwsManagedPolicyName(policyName)
      ),
      roleName: props.roleName,
    });
  }
}
