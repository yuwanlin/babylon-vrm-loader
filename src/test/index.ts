import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import type { VRMManager } from '../vrm-manager';
import { WebXRFeatureName, SkeletonViewer } from '@babylonjs/core';

import '@babylonjs/core/Helpers/sceneHelpers';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/torusKnotBuilder';
import '@babylonjs/inspector';
// eslint-disable-next-line import/no-internal-modules
import '../index';
import { AdvancedDynamicTexture, Control, Slider, StackPanel, TextBlock } from '@babylonjs/gui';
import * as Debug from '@babylonjs/inspector';

async function main() {
    const debugProperties = getDebugProperties();
    const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    const engine = new Engine(canvas, true, {
        alpha: false,
        disableWebGL2Support: debugProperties.webgl1,
    });

    const scene = new Scene(engine);
    const camera = new ArcRotateCamera('MainCamera1', 0, 0, 3, new Vector3(0, 1.2, 0), scene, true);
    camera.lowerRadiusLimit = 0.1;
    camera.upperRadiusLimit = 20;
    camera.wheelDeltaPercentage = 0.01;
    camera.minZ = 0.3;
    camera.position = new Vector3(0, 1.2, -3);
    camera.attachControl(canvas, true);

    scene.createDefaultEnvironment({
        createGround: true,
        createSkybox: false,
        enableGroundMirror: false,
        enableGroundShadow: false,
    });

    console.log('===========Debug', Debug);

    // Lights
    const directionalLight = new DirectionalLight('DirectionalLight1', new Vector3(0, -0.5, 1.0), scene);
    directionalLight.position = new Vector3(0, 25, -50);
    directionalLight.setEnabled(true);
    const hemisphericLight = new HemisphericLight('HemisphericLight1', new Vector3(-0.2, -0.8, -1), scene);
    hemisphericLight.setEnabled(false);
    const pointLight = new PointLight('PointLight1', new Vector3(0, 0, 1), scene);
    pointLight.setEnabled(false);

    // Meshes
    // const standardMaterialSphere = Mesh.CreateSphere('StandardMaterialSphere1', 16, 1, scene);
    // standardMaterialSphere.position = new Vector3(1.5, 1.2, 0);
    // standardMaterialSphere.receiveShadows = true;

    // const shadowCaster = Mesh.CreateTorusKnot('ShadowCaster', 1, 0.2, 32, 32, 2, 3, scene);
    // shadowCaster.position = new Vector3(0.0, 5.0, -10.0);
    // shadowCaster.setEnabled(debugProperties.shadow);
    // if (debugProperties.shadow) {
    //     const shadowGenerator = new ShadowGenerator(1024, directionalLight);
    //     shadowGenerator.addShadowCaster(shadowCaster);
    // }

    if (debugProperties.inspector) {
        await scene.debugLayer.show({
            globalRoot: document.getElementById('wrapper') as HTMLElement,
        });
    }

    // Expose current scene
    (window as any).currentScene = scene;
    scene.onBeforeRenderObservable.add(() => {
        // SpringBone
        if (!scene.metadata || !scene.metadata.vrmManagers) {
            return;
        }
        const managers = scene.metadata.vrmManagers as VRMManager[];
        const deltaTime = scene.getEngine().getDeltaTime();
        managers.forEach((manager) => {
            manager.update(deltaTime);
        });
    });
    engine.runRenderLoop(() => {
        scene.render();
        // shadowCaster.rotate(Vector3.Up(), 0.01);
    });
    window.addEventListener('resize', () => {
        engine.resize();
    });
    SceneLoader.AppendAsync('./', 'AliciaSolid.vrm', scene).then((scene: Scene) => {
        // console.log('==========', scene.metadata.vrmManagers);
        const manager = scene.metadata.vrmManagers[0];
        addUI(manager);
        makePose(manager);
        console.log('aaa', scene, manager);

        let options = {
            pauseAnimations: false,
            returnToRest: false,
            computeBonesUsingShaders: true,
            useAllBones: false,
            displayMode: SkeletonViewer.DISPLAY_SPHERE_AND_SPURS,
            displayOptions: {
                sphereBaseSize: 1,
                sphereScaleUnit: 10,
                sphereFactor: 0.9,
                midStep: 0.25,
                midStepFactor: 0.05,
            },
        };
        // let skeletonView = new SkeletonViewer(
        //     manager.skeleton,
        //     mesh,
        //     scene,
        //     false, //autoUpdateBoneMatrices?
        //     (mesh.renderingGroupId > 0 )?mesh.renderingGroupId+1:1,  // renderingGroup
        //     options
        // );
    });

    const xr = await scene.createDefaultXRExperienceAsync();
    xr.input.onControllerAddedObservable.add((inputSource) => {
        inputSource.onMotionControllerInitObservable.add((motionController) => {
            motionController.handness;
        });
    });
    xr.baseExperience.featuresManager.enableFeature(WebXRFeatureName.HAND_TRACKING, 'latest', {
        xrInput: xr.input,
    });

    // scene.enable

    // let fileCount = 1;
    // (document.getElementById('file-input') as HTMLInputElement).addEventListener('change', (evt) => {
    //     const file = (evt as any).target.files[0];
    //     console.log(`loads ${file.name} ${file.size} bytes`);
    //     const currentMeshCount = scene.meshes.length;
    //     SceneLoader.Append('file:', file, scene, () => {
    //         console.log(`loaded ${file.name}`);
    //         for (let i = currentMeshCount; i < scene.meshes.length; i++) {
    //             scene.meshes[i].translate(Vector3.Right(), 1.5 * fileCount);
    //             scene.meshes[i].receiveShadows = true;
    //         }
    //         fileCount++;
    //     });
    // });

    function addUI(manager: VRMManager) {
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI');
        console.log('advancedDynamicTexture.layer', advancedTexture.layer);
        advancedTexture.layer!.layerMask = 2;

        const panel3 = new StackPanel();
        panel3.width = '220px';
        panel3.fontSize = '14px';
        panel3.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel3.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        advancedTexture.addControl(panel3);

        function addSlider(text: string, callback: (value: number) => void, defaultValue = 0) {
            const header = new TextBlock();
            header.text = text;
            header.height = '40px';
            header.color = 'white';
            header.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            panel3.addControl(header);

            const slider = new Slider();
            slider.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            slider.minimum = 0;
            slider.maximum = 1;
            slider.color = 'green';
            slider.value = defaultValue;
            slider.height = '20px';
            slider.width = '200px';
            slider.onValueChangedObservable.add(callback);
            callback(defaultValue);
            panel3.addControl(slider);
        }

        addSlider(
            'Joy:',
            (num) => {
                manager.morphingPreset('joy', num);
            },
            1
        );
        addSlider('Angry:', (num) => {
            manager.morphingPreset('angry', num);
        });
        addSlider('Sorrow:', (num) => {
            manager.morphingPreset('sorrow', num);
        });
        addSlider('Fun:', (num) => {
            manager.morphingPreset('fun', num);
        });
        addSlider('Blink:', (num) => {
            manager.morphingPreset('blink', num);
        });
        addSlider(
            'A:',
            (num) => {
                manager.morphingPreset('a', num);
            },
            1
        );
        addSlider('I:', (num) => {
            manager.morphingPreset('i', num);
        });
        addSlider('U:', (num) => {
            manager.morphingPreset('u', num);
        });
        addSlider('E:', (num) => {
            manager.morphingPreset('e', num);
        });
        addSlider('O:', (num) => {
            manager.morphingPreset('o', num);
        });
    }

    function makePose(manager: VRMManager) {
        /**
         * hips: 臀部
         * spine: 脊柱
         * upperChest: 上胸部
         * neck: 脖子
         */
        const poses = {
            hips: Quaternion.FromEulerAngles(0, 0, 0),
            spine: Quaternion.FromEulerAngles(-Math.PI / 20, Math.PI / 20, 0),
            chest: Quaternion.FromEulerAngles(0, 0, 0),
            upperChest: Quaternion.FromEulerAngles(0, 0, 0),
            neck: Quaternion.FromEulerAngles(0, 0, 0),
            head: Quaternion.FromEulerAngles(0, 0, -Math.PI / 30),
            leftEye: Quaternion.FromEulerAngles(0, 0, 0),
            leftShoulder: Quaternion.FromEulerAngles(0, 0, Math.PI / 4),
            leftUpperArm: Quaternion.FromEulerAngles(0, 0, 0),
            leftLowerArm: Quaternion.FromEulerAngles(0, 0, Math.PI / 4),
            leftHand: Quaternion.FromEulerAngles(0, 0, 0),
            leftThumbProximal: Quaternion.FromEulerAngles(0, 0, 0),
            leftThumbIntermediate: Quaternion.FromEulerAngles(0, 0, 0),
            leftThumbDistal: Quaternion.FromEulerAngles(0, 0, 0),
            leftIndexProximal: Quaternion.FromEulerAngles(0, 0, 0),
            leftIndexIntermediate: Quaternion.FromEulerAngles(0, 0, 0),
            leftIndexDistal: Quaternion.FromEulerAngles(0, 0, 0),
            leftMiddleProximal: Quaternion.FromEulerAngles(0, 0, 0),
            leftMiddleIntermediate: Quaternion.FromEulerAngles(0, 0, 0),
            leftMiddleDistal: Quaternion.FromEulerAngles(0, 0, 0),
            leftRingProximal: Quaternion.FromEulerAngles(0, 0, 0),
            leftRingIntermediate: Quaternion.FromEulerAngles(0, 0, 0),
            leftRingDistal: Quaternion.FromEulerAngles(0, 0, 0),
            leftLittleProximal: Quaternion.FromEulerAngles(0, 0, 0),
            leftLittleIntermediate: Quaternion.FromEulerAngles(0, 0, 0),
            leftLittleDistal: Quaternion.FromEulerAngles(0, 0, 0),
            leftUpperLeg: Quaternion.FromEulerAngles(0, 0, 0),
            leftLowerLeg: Quaternion.FromEulerAngles(0, 0, 0),
            leftFoot: Quaternion.FromEulerAngles(0, 0, 0),
            leftToe: Quaternion.FromEulerAngles(0, 0, 0),
            rightEye: Quaternion.FromEulerAngles(0, 0, 0),
            rightShoulder: Quaternion.FromEulerAngles(0, Math.PI / 6, 0),
            rightUpperArm: Quaternion.FromEulerAngles(0, Math.PI / 4, 0),
            rightLowerArm: Quaternion.FromEulerAngles(0, Math.PI / 8, 0),
            rightHand: Quaternion.FromEulerAngles(0, 0, Math.PI / 2),
            rightThumbProximal: Quaternion.FromEulerAngles(-Math.PI / 8, -Math.PI / 4, 0),
            rightThumbIntermediate: Quaternion.FromEulerAngles(-Math.PI / 4, 0, 0),
            rightThumbDistal: Quaternion.FromEulerAngles(0, 0, 0),
            rightIndexProximal: Quaternion.FromEulerAngles(0, Math.PI / 12, 0),
            rightIndexIntermediate: Quaternion.FromEulerAngles(0, 0, 0),
            rightIndexDistal: Quaternion.FromEulerAngles(0, 0, 0),
            rightMiddleProximal: Quaternion.FromEulerAngles(0, -Math.PI / 12, 0),
            rightMiddleIntermediate: Quaternion.FromEulerAngles(0, 0, 0),
            rightMiddleDistal: Quaternion.FromEulerAngles(0, 0, 0),
            rightRingProximal: Quaternion.FromEulerAngles(0, 0, -Math.PI / 2),
            rightRingIntermediate: Quaternion.FromEulerAngles(0, 0, -Math.PI / 2),
            rightRingDistal: Quaternion.FromEulerAngles(0, 0, 0),
            rightLittleProximal: Quaternion.FromEulerAngles(0, 0, -Math.PI / 2),
            rightLittleIntermediate: Quaternion.FromEulerAngles(0, 0, -Math.PI / 2),
            rightLittleDistal: Quaternion.FromEulerAngles(0, 0, 0),
            rightUpperLeg: Quaternion.FromEulerAngles(0, 0, 0),
            rightLowerLeg: Quaternion.FromEulerAngles(0, 0, 0),
            rightFoot: Quaternion.FromEulerAngles(0, 0, 0),
            rightToe: Quaternion.FromEulerAngles(0, 0, 0),
        };

        Object.keys(poses).forEach((boneName) => {
            // @ts-ignore
            if (!manager.humanoidBone[boneName]) {
                return;
            }
            // @ts-ignore
            manager.humanoidBone[boneName].rotationQuaternion = poses[boneName];
        });
    }
}

interface DebugProperties {
    webgl1: boolean;
    shadow: boolean;
    inspector: boolean;
}

function getDebugProperties(): DebugProperties {
    const href = window.location.href;

    return {
        webgl1: href.includes('webgl1'),
        shadow: true,
        inspector: true,
    };

    return {
        webgl1: href.includes('webgl1'),
        shadow: href.includes('shadow'),
        inspector: href.includes('inspector'),
    };
}

main().catch((reason) => {
    console.error(reason);
});
