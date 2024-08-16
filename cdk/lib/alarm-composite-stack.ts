import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";

interface CompositeAlarmStackProps extends cdk.StackProps {
  alarmArns: string[];
  compositeOperator: "AND" | "OR";
  compositeAlarmName: string;
  compositeAlarmDescription?: string;
  alarmActions?: cloudwatch.IAlarmAction[]; // IAlarmAction instances for composite alarm actions
}

export class CompositeAlarmStack extends cdk.Stack {
  public readonly compositeAlarm: cloudwatch.CompositeAlarm;

  constructor(scope: Construct, id: string, props: CompositeAlarmStackProps) {
    super(scope, id, props);

    const importedAlarms = props.alarmArns.map((arn, index) =>
      cloudwatch.Alarm.fromAlarmArn(this, `ImportedAlarm${index}`, arn)
    );

    const alarmRule =
      props.compositeOperator === "AND"
        ? cloudwatch.AlarmRule.allOf(
            ...importedAlarms.map((alarm) =>
              cloudwatch.AlarmRule.fromAlarm(alarm, cloudwatch.AlarmState.ALARM)
            )
          )
        : cloudwatch.AlarmRule.anyOf(
            ...importedAlarms.map((alarm) =>
              cloudwatch.AlarmRule.fromAlarm(alarm, cloudwatch.AlarmState.ALARM)
            )
          );

    this.compositeAlarm = new cloudwatch.CompositeAlarm(
      this,
      "CompositeAlarm",
      {
        alarmRule: alarmRule,
        compositeAlarmName: props.compositeAlarmName,
        alarmDescription: props.compositeAlarmDescription,
        actionsEnabled: props.alarmActions ? true : false,
      }
    );

    if (props.alarmActions) {
      this.compositeAlarm.addAlarmAction(...props.alarmActions);
    }

    // Output the composite alarm ARN
    new cdk.CfnOutput(this, "CompositeAlarmArn", {
      value: this.compositeAlarm.alarmArn,
      exportName: `${this.compositeAlarm.alarmName}-Arn`,
    });
  }
}
