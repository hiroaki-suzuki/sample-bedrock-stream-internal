import { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { namePrefix } from '../utils'
import { Tags } from 'aws-cdk-lib'

export interface SecurityGroupProps {
  vpc: ec2.IVpc
}

export class SecurityGroup extends Construct {
  public readonly albSecurityGroup: ec2.SecurityGroup
  public readonly frontEcsSecurityGroup: ec2.SecurityGroup
  public readonly webSocketEcsSecurityGroup: ec2.SecurityGroup
  public readonly vpcEndpointSecurityGroup: ec2.SecurityGroup

  constructor(scope: Construct, id: string, props: SecurityGroupProps) {
    super(scope, id)

    const { vpc } = props
    // ALB Security Group
    const albSecurityGroup = new ec2.SecurityGroup(this, `${namePrefix}-alb-sg`, {
      securityGroupName: `${namePrefix}-alb-sg`,
      vpc,
    })
    Tags.of(albSecurityGroup).add('Name', `${namePrefix}-alb-sg`)

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'from Anywhere to Front ECS',
    )
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8080),
      'from Anywhere to WebSocket ECS',
    )

    // Front ECS Security Group
    const frontEcsSecurityGroup = new ec2.SecurityGroup(this, `${namePrefix}-front-ecs-sg`, {
      securityGroupName: `${namePrefix}-front-ecs-sg`,
      vpc,
    })
    Tags.of(frontEcsSecurityGroup).add('Name', `${namePrefix}-front-ecs-sg`)

    frontEcsSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(80), 'from ALB')

    // WebSocket ECS Security Group
    const webSocketEcsSecurityGroup = new ec2.SecurityGroup(
      this,
      `${namePrefix}-websocket-ecs-sg`,
      {
        securityGroupName: `${namePrefix}-websocket-ecs-sg`,
        vpc,
      },
    )
    Tags.of(webSocketEcsSecurityGroup).add('Name', `${namePrefix}-websocket-ecs-sg`)

    webSocketEcsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(8081),
      'from ALB to HealthCheck',
    )
    webSocketEcsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(8080),
      'from ALB to WebSocket',
    )

    // VPC Endpoint Security Group
    const vpcEndpointSecurityGroup = new ec2.SecurityGroup(this, `${namePrefix}-endpoint-sg`, {
      securityGroupName: `${namePrefix}-endpoint-sg`,
      vpc,
    })
    Tags.of(vpcEndpointSecurityGroup).add('Name', `${namePrefix}-endpoint-sg`)

    vpcEndpointSecurityGroup.addIngressRule(
      frontEcsSecurityGroup,
      ec2.Port.tcp(443),
      'from Front ECS',
    )
    vpcEndpointSecurityGroup.addIngressRule(
      webSocketEcsSecurityGroup,
      ec2.Port.tcp(443),
      'from WebSocket ECS',
    )

    this.albSecurityGroup = albSecurityGroup
    this.frontEcsSecurityGroup = frontEcsSecurityGroup
    this.webSocketEcsSecurityGroup = webSocketEcsSecurityGroup
    this.vpcEndpointSecurityGroup = vpcEndpointSecurityGroup
  }
}
