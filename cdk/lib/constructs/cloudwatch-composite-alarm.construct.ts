import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cdk from "aws-cdk-lib";

interface CloudWatchCompositeAlarmConstructProps {
  alarmArns: string[];
  compositeOperator: "AND" | "OR";
  compositeAlarmName: string;
  compositeAlarmDescription?: string;
  alarmActions?: cloudwatch.IAlarmAction[]; // Optional composite alarm actions
}

export class CloudWatchCompositeAlarmConstruct extends Construct {
  public readonly compositeAlarm: cloudwatch.CompositeAlarm;

  constructor(
    scope: Construct,
    id: string,
    props: CloudWatchCompositeAlarmConstructProps
  ) {
    super(scope, id);

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
  }
}
