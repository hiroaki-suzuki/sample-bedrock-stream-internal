import { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { namePrefix } from '../utils'

export interface LoadBalancerProps {
  vpc: ec2.IVpc
  frontService: ecs.FargateService
  webSocketService: ecs.FargateService
  albSecurityGroup: ec2.SecurityGroup
}

export class LoadBalancer extends Construct {
  constructor(scope: Construct, id: string, props: LoadBalancerProps) {
    super(scope, id)

    const { vpc, frontService, webSocketService, albSecurityGroup } = props

    const alb = new elb.ApplicationLoadBalancer(this, `${namePrefix}-alb`, {
      loadBalancerName: `${namePrefix}-alb`,
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
    })

    const frontListener = alb.addListener(`${namePrefix}-front-listener`, {
      port: 80,
    })
    frontListener.addTargets(`${namePrefix}-front-tg`, {
      targetGroupName: `${namePrefix}-front-tg`,
      port: 80,
      targets: [frontService],
    })

    const webSocketListener = alb.addListener(`${namePrefix}-websocket-listener`, {
      port: 8080,
    })
    webSocketListener.addTargets(`${namePrefix}-websocket-tg`, {
      targetGroupName: `${namePrefix}-websocket-tg`,
      port: 8080,
      targets: [webSocketService],
      healthCheck: {
        path: '/',
        port: '8081',
      },
    })
  }
}
