import { Construct } from 'constructs';
import { TerraformStack } from 'cdktf';
import { getOpenstackProvider } from '../lib';
import { ComputeInstanceV2 } from '../.gen/providers/openstack';

export class CodeServerStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);


    // define resources here
    getOpenstackProvider(this);

    const userData = `#!/bin/sh
      export DEBIAN_FRONTEND=noninteractive

      # os update
      apt -y update && apt -y upgrade

      # install docker
      apt-get -y install ca-certificates curl gnupg lsb-release
      mkdir -p /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
      apt-get -y update && apt-get -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin

      # install kubectl
      curl -LO "https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl"
      chmod +x ./kubectl
      mv ./kubectl /usr/local/bin/kubectl

      # install terraform
      curl -fsSL https://apt.releases.hashicorp.com/gpg | apt-key add -
      apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
      apt-get -y update && apt-get -y install terraform

      # install mysql-client
      apt install -y mysql-client

      # install mongosh
      wget -qO- https://www.mongodb.org/static/pgp/server-6.0.asc | tee /etc/apt/trusted.gpg.d/server-6.0.asc
      echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
      apt-get update && apt-get install -y mongodb-mongosh

      # install code server
      curl -fOL https://github.com/coder/code-server/releases/download/v4.5.0/code-server_4.5.0_amd64.deb
      dpkg -i code-server_4.5.0_amd64.deb
      systemctl enable --now code-server@root

      # dependencies for pyenv
      apt-get -y install make build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev

      # install nvidia driver
      apt -y install nvidia-driver-535

      # install cli tools
      apt -y install jq jsonnet

      # install cuda toolkit
      wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-ubuntu2204.pin
      mv cuda-ubuntu2204.pin /etc/apt/preferences.d/cuda-repository-pin-600
      wget https://developer.download.nvidia.com/compute/cuda/12.2.2/local_installers/cuda-repo-ubuntu2204-12-2-local_12.2.2-535.104.05-1_amd64.deb
      dpkg -i cuda-repo-ubuntu2204-12-2-local_12.2.2-535.104.05-1_amd64.deb && rm -f cuda-repo-ubuntu2204-12-2-local_12.2.2-535.104.05-1_amd64.deb 
      cp /var/cuda-repo-ubuntu2204-12-2-local/cuda-*-keyring.gpg /usr/share/keyrings/
      apt-get update && apt-get -y install cuda

      # install nvidia container driver
      curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | apt-key add -
      export distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
      curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | tee /etc/apt/sources.list.d/nvidia-docker.list
      apt -y update
      apt install -y nvidia-docker2

      # mount volume
      echo '/dev/vdb /root ext4 defaults 0 0' >> /etc/fstab

      # reboot host
      reboot
    `;

    new ComputeInstanceV2(this, 'CodeServer', {
      name: 'code-server',
      imageName: 'ubuntu-jammy',
      flavorName: 'p1.6xlarge',
      keyPair: 'bbrfkr',
      securityGroups: ['allow-all'],
      network: [{ name: 'common' }],
      userData: userData,
      blockDevice: [
        {
          uuid: "ac0d794a-2067-43ed-b726-af10ae0814b5",
          sourceType: "image",
          destinationType: "volume",
          volumeSize: 100,
          bootIndex: 0,
          deleteOnTermination: true,
        },
        {
          uuid: "a3237394-73b5-401e-8c36-933d303f4b6e",
          sourceType: "volume",
          destinationType: "volume",
          bootIndex: 1,
          deleteOnTermination: false,
        }
      ]
    });
  }
}
