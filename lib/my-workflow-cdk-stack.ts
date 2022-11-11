import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { join } from 'path';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class MyWorkflowCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const failingChild = new cdk.aws_stepfunctions.Fail(this, 'FailingChild', {
      cause: "Child.UndefinedFailure",
      error: "Child.UndefinedFailure",
      comment: "We failed :("
    })
    const succeedingChild = new cdk.aws_stepfunctions.Succeed(this, 'SucceedingChild', {})
    const logGroup = new cdk.aws_logs.LogGroup(this, 'MyLogGroup');

    const childSucceedingWorkflow = new cdk.aws_stepfunctions.StateMachine(this, 'GoodChild', {
      stateMachineType: cdk.aws_stepfunctions.StateMachineType.EXPRESS,
      logs: {
        destination: logGroup,
        level: cdk.aws_stepfunctions.LogLevel.ALL
      },
      definition: cdk.aws_stepfunctions.Chain.start(
        succeedingChild
      )
    })

    const childFailingWorkflow = new cdk.aws_stepfunctions.StateMachine(this, 'BadChild', {
      stateMachineType: cdk.aws_stepfunctions.StateMachineType.EXPRESS,
      logs: {
        destination: logGroup,
        level: cdk.aws_stepfunctions.LogLevel.ALL
      },
      definition: cdk.aws_stepfunctions.Chain.start(
        failingChild
      )
    })

    const failingTask = new cdk.aws_stepfunctions_tasks.StepFunctionsStartExecution(this, 'FailingChildTask', {
      stateMachine: childFailingWorkflow,
      integrationPattern: cdk.aws_stepfunctions.IntegrationPattern.RUN_JOB,
      input: cdk.aws_stepfunctions.TaskInput.fromObject(
        {"AWS_STEP_FUNCTIONS_STARTED_BY_EXECUTION_ID.$": "$$.Execution.Id"}
      )
    })

    const succeedingTask = new cdk.aws_stepfunctions_tasks.StepFunctionsStartExecution(this, 'SucceedingChildTask', {
      stateMachine: childSucceedingWorkflow,
      integrationPattern: cdk.aws_stepfunctions.IntegrationPattern.RUN_JOB,
      input: cdk.aws_stepfunctions.TaskInput.fromObject(
        {"AWS_STEP_FUNCTIONS_STARTED_BY_EXECUTION_ID.$": "$$.Execution.Id"}
      )
    })

    const catchALl = new cdk.aws_stepfunctions.Pass(this, 'CatchALl', {
      parameters: {"ErrorObject.$": "$"}
    })

    const parentStateMachine = new cdk.aws_stepfunctions.StateMachine(this, 'Parent', {
      stateMachineType: cdk.aws_stepfunctions.StateMachineType.STANDARD,
      logs: {
        destination: logGroup,
        level: cdk.aws_stepfunctions.LogLevel.ALL
      },
      definition: cdk.aws_stepfunctions.Chain.start(
        new cdk.aws_stepfunctions.Parallel(this, 'RunChildren', {
        })
          .branch(failingTask.addCatch(catchALl, {errors: ['Child.UndefinedFailure', 'States.TaskFailed']}))
          .branch(succeedingTask)
      )
    })
    parentStateMachine.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        resources: [
          childFailingWorkflow.stateMachineArn,
          childSucceedingWorkflow.stateMachineArn
        ],
        actions: ["states:*"],
        effect: cdk.aws_iam.Effect.ALLOW
      })
    )
  }

}
