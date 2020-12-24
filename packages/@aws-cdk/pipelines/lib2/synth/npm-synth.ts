import * as path from 'path';
import { AddSynthToGraphOptions, Synth } from '.';
import { cloudAssemblyBuildSpecDir } from '../../lib/private/construct-internals';
import { toPosixPath } from '../../lib/private/fs';
import { ExecutionArtifact, ExecutionShellAction } from '../graph';
import { CommandImage } from '../image';

export interface StandardSynthProps {
  readonly installCommands?: string[];
  readonly buildCommands?: string[];
  readonly synthCommands?: string[];
  readonly testCommands?: string[];
  readonly image?: CommandImage;
  readonly synthBuildsDockerImages?: boolean;
  readonly testReports?: boolean;
  readonly subdirectory?: string;
  readonly environmentVariables?: Record<string, string>;

  // TODO: How to specify additional inputs and outputs??

  // readonly outputDirectories?: ShellCommandArtifact[];

  // TODO: How to specify additional policies?
}

export class NpmSynth extends Synth {
  constructor(private readonly props: StandardSynthProps) {
    super();
  }

  public addToExecutionGraph(options: AddSynthToGraphOptions): void {
    if (options.root.sourceArtifacts.length !== 1) {
      // TODO: FIXME
      throw new Error('TODO: For now, only exactly one source is supported');
    }

    const asm = new ExecutionArtifact('CloudAssemblyArtifact');

    const action = new ExecutionShellAction('Synth', {
      installCommands: [
        ...this.props.subdirectory ? [`cd ${this.props.subdirectory}`] : [],
        ...this.props.installCommands ?? ['npm install'],
      ],
      buildCommands: [
        ...this.props.buildCommands ?? [],
        ...this.props.testCommands ?? [],
        ...this.props.synthCommands ?? ['npx cdk synth'],
      ],
      image: this.props.image,
      buildsDockerImages: this.props.synthBuildsDockerImages,
      testReports: this.props.testReports,
      environmentVariables: this.props.environmentVariables,
      inputs: options.root.sourceArtifacts.map(artifact => ({
        artifact,
        directory: '.',
      })),
      outputs: [
        {
          directory: toPosixPath(path.join(this.props.subdirectory ?? '.', cloudAssemblyBuildSpecDir(options.scope))),
          artifact: asm,
        },
      ],
    });

    asm.recordProducer(action);
    options.parent.add(action);
    options.root.setCloudAssemblyArtifact(asm);
  }
}