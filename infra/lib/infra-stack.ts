import * as cdk from 'aws-cdk-lib'
import { Tags } from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import { Network } from './constructs/network'
import { SecurityGroup } from './constructs/security-group'
import { Endpoint } from './constructs/endpoint'
import { namePrefix } from './utils'
import { Frontend } from './constructs/frontend'
import { WebSocket } from './constructs/websocket'
import { LoadBalancer } from './constructs/load-balancer'

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const { vpc } = new Network(this, 'network')

    const {
      vpcEndpointSecurityGroup,
      frontEcsSecurityGroup,
      webSocketEcsSecurityGroup,
      albSecurityGroup,
    } = new SecurityGroup(this, 'security-group', { vpc: vpc })

    new Endpoint(this, 'endpoint', {
      vpc: vpc,
      vpcEndpointSecurityGroup: vpcEndpointSecurityGroup,
    })

    const ecsTaskExecutionRole = new iam.Role(this, `${namePrefix}-ecs-task-execution-role`, {
      roleName: `${namePrefix}-ecs-task-execution-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    })

    const { service: frontService } = new Frontend(this, 'front', {
      vpc: vpc,
      taskExecutionRole: ecsTaskExecutionRole,
      frontEcsSecurityGroup: frontEcsSecurityGroup,
    })

    const { service: webSocketService } = new WebSocket(this, 'websocket', {
      vpc: vpc,
      taskExecutionRole: ecsTaskExecutionRole,
      webSocketEcsSecurityGroup,
    })

    new LoadBalancer(this, 'load-balancer', {
      vpc: vpc,
      frontService,
      webSocketService,
      albSecurityGroup: albSecurityGroup,
    })

    Tags.of(this).add('Environment', 'Dev')
  }
}
