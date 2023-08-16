import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Axis, Color3, Matrix, Quaternion, Space, Vector3 } from '@babylonjs/core/Maths/math';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import type { VRMManager } from '../vrm-manager';

import '@babylonjs/core/Helpers/sceneHelpers';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/torusKnotBuilder';
import '@babylonjs/inspector';
// eslint-disable-next-line import/no-internal-modules
import '../index';
import {
    AbstractMesh,
    AmmoJSPlugin,
    AxesViewer,
    HandPart,
    MeshBuilder,
    Tools,
    TransformNode,
    WebXRFeatureName,
    WebXRHand,
    WebXRHandJoint,
    WebXRHandTracking,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Control, Slider, StackPanel, TextBlock, GUI3DManager, StackPanel3D, Button3D } from '@babylonjs/gui';
const { ToRadians, ToDegrees } = Tools;

// @ts-ignore
function localAxes(size, scene) {
    const pilot_local_axisX = Mesh.CreateLines(
        'pilot_local_axisX',
        [Vector3.Zero(), new Vector3(size, 0, 0), new Vector3(size * 0.95, 0.05 * size, 0), new Vector3(size, 0, 0), new Vector3(size * 0.95, -0.05 * size, 0)],
        scene,
        false
    );
    pilot_local_axisX.color = new Color3(1, 0, 0);

    const pilot_local_axisY = Mesh.CreateLines(
        'pilot_local_axisY',
        [Vector3.Zero(), new Vector3(0, size, 0), new Vector3(-0.05 * size, size * 0.95, 0), new Vector3(0, size, 0), new Vector3(0.05 * size, size * 0.95, 0)],
        scene,
        false
    );
    pilot_local_axisY.color = new Color3(0, 1, 0);

    const pilot_local_axisZ = Mesh.CreateLines(
        'pilot_local_axisZ',
        [Vector3.Zero(), new Vector3(0, 0, size), new Vector3(0, -0.05 * size, size * 0.95), new Vector3(0, 0, size), new Vector3(0, 0.05 * size, size * 0.95)],
        scene,
        false
    );
    pilot_local_axisZ.color = new Color3(0, 0, 1);

    const local_origin = Mesh.CreateBox('local_origin', 1, scene, false);
    local_origin.isVisible = false;

    pilot_local_axisX.parent = local_origin;
    pilot_local_axisY.parent = local_origin;
    pilot_local_axisZ.parent = local_origin;

    return local_origin;
}
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

    const shadowCaster = Mesh.CreateTorusKnot('ShadowCaster', 1, 0.2, 32, 32, 2, 3, scene);
    shadowCaster.position = new Vector3(0.0, 5.0, -10.0);
    shadowCaster.setEnabled(debugProperties.shadow);
    if (debugProperties.shadow) {
        const shadowGenerator = new ShadowGenerator(1024, directionalLight);
        shadowGenerator.addShadowCaster(shadowCaster);
    }

    if (debugProperties.inspector) {
        await scene.debugLayer.show({
            globalRoot: document.getElementById('wrapper') as HTMLElement,
            showInspector: true,
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
        shadowCaster.rotate(Vector3.Up(), 0.01);
    });
    window.addEventListener('resize', () => {
        engine.resize();
    });
    // await SceneLoader.ImportMeshAsync('', './AliciaSolid.vrm', '', scene);
    SceneLoader.AppendAsync('./', 'K-00510.vrm', scene).then((scene: Scene) => {
        // console.log('==========', scene.metadata.vrmManagers);
        const manager = scene.metadata.vrmManagers[0];
        const rootMesh = scene.getMeshByName('__root__')!;

        const handMesh = scene.getTransformNodeByName('RightHand')!;
        const rightIndex1 = scene.getTransformNodeByName('RightHandIndex1')!;
        const rightIndex2 = scene.getTransformNodeByName('RightHandIndex2')!;

        const vectorAB = handMesh.position.subtract(rightIndex1.position);
        const angleRadians = Math.atan2(vectorAB.z, vectorAB.x);

        // 将弧度转换为角度
        const angleDegrees = Tools.ToDegrees(angleRadians);

        // console.log(angleDegrees); // 输出：45

        const angle = getAngle(rightIndex1, handMesh, rightIndex2);
        console.log('初始角度', angleDegrees);

        // handMesh.scaling = new Vector3(2, 2, 2);
        // const localOrigin = localAxes(0.5, scene);
        // localOrigin.parent = handMesh;

        const bone = scene.metadata.vrmManagers[0].humanoidBone;

        bone.rightLowerArm.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI / 2, 0);
        console.log('key', bone, bone.rightLowerArm);
        // bone['rightThumbIntermediate'].rotationQuaternion = Quaternion.FromEulerAngles(ToRadians(-50), ToRadians(-50), ToRadians(-50));
        // bone['rightThumbIntermediate'].rotate(new Vector3(1, 1, 1), -Math.PI / 1.5, Space.LOCAL);
        // localAxes(0.5, scene).parent = bone['rightIndexProximal'];
        // makePose(manager);
    });

    const axes = new AxesViewer();
    // axes.update(new Vector3(2, 0, 0), Axis.X, Axis.Y, Axis.Z);

    // @ts-ignore
    await window.Ammo().catch((err) => alert(err));
    scene.enablePhysics(undefined, new AmmoJSPlugin());
    const xr = await scene.createDefaultXRExperienceAsync();

    const xrHeader = xr.baseExperience.camera;

    // xr.input.onControllerAddedObservable.add((inputSource) => {
    //     inputSource.onMotionControllerInitObservable.add((motionController) => {
    //         console.log('=======handness', motionController, xr.input.controllers[0]);
    //     });
    // });

    const xrHandFeature = xr.baseExperience.featuresManager.enableFeature(WebXRFeatureName.HAND_TRACKING, 'latest', {
        xrInput: xr.input,
        jointMeshes: {
            // disableDefaultHandMesh: true,
            // enablePhysics: true,
        },
    }) as unknown as WebXRHandTracking;

    // scene.onPointerObservable.add((evt) => {
    //     const pointerId = (evt.event as any).pointerId;

    //     const xrController = xr.pointerSelection.getXRControllerByPointerId(pointerId);
    //     // const webXrHand = xrHandFeature.getHandByControllerId(xrController!.uniqueId);
    //     // webXrHand;
    //     // console.log('=======', xrController?.uniqueId);
    // });
    let leftHand: WebXRHand;
    let rightHand: WebXRHand;

    xrHandFeature.onHandAddedObservable.add((newHand: WebXRHand) => {
        const vrmManager = scene.metadata.vrmManagers[0];
        const handedness = newHand.xrController.inputSource.handedness as XRHandedness;
        if (handedness === 'none') return;
        if (handedness === 'left') {
            leftHand = newHand;
        } else {
            rightHand = newHand;
        }
    });

    const manager = new GUI3DManager(scene);

    // Create a horizontal stack panel
    const panel = new StackPanel3D();
    panel.margin = 0.02;

    manager.addControl(panel);
    panel.position.z = -1.5;

    // Let's add some buttons!
    const addButton = function () {
        const button = new Button3D('orientation', { width: 2 });
        panel.addControl(button);
        // button.onPointerUpObservable.add(function () {
        //     panel.isVertical = !panel.isVertical;
        // });

        const text1 = new TextBlock();
        text1.text = 'change orientation';
        text1.color = 'white';
        text1.fontSize = 12;
        button.content = text1;
        button.position.y = 0.5;
        button.scaling = new Vector3(0.5, 0.5, 0.5);

        const setContent = (text2: string) => {
            text1.text = text2;
        };

        // setContent('222');
        return setContent;
    };

    function getAngle(originMesh: TransformNode, mesh1: TransformNode, mesh2: TransformNode) {
        const line1 = originMesh.position.subtract(mesh1.position);
        const line2 = originMesh.position.subtract(mesh2.position);
        const normal = Vector3.Cross(line1, line2).normalize();

        const angle = Vector3.GetAngleBetweenVectors(line1, line2, normal);
        return angle;
    }

    function makeRightHandSync(hand: WebXRHand) {
        const bone = scene.metadata.vrmManagers[0].humanoidBone;
        const wristMesh0 = hand.getJointMesh(WebXRHandJoint.WRIST); // 手腕
        const thumb1 = hand.getJointMesh(WebXRHandJoint.THUMB_METACARPAL); // 拇指
        const thumb2 = hand.getJointMesh(WebXRHandJoint.THUMB_PHALANX_PROXIMAL);
        const thumb3 = hand.getJointMesh(WebXRHandJoint.THUMB_PHALANX_DISTAL);
        const thumb4 = hand.getJointMesh(WebXRHandJoint.THUMB_TIP);
        const index5 = hand.getJointMesh(WebXRHandJoint.INDEX_FINGER_METACARPAL);
        const index6 = hand.getJointMesh(WebXRHandJoint.INDEX_FINGER_PHALANX_PROXIMAL);
        const index7 = hand.getJointMesh(WebXRHandJoint.INDEX_FINGER_PHALANX_INTERMEDIATE);
        const index8 = hand.getJointMesh(WebXRHandJoint.INDEX_FINGER_PHALANX_DISTAL);
        const index9 = hand.getJointMesh(WebXRHandJoint.INDEX_FINGER_TIP);
        const middle10 = hand.getJointMesh(WebXRHandJoint.MIDDLE_FINGER_METACARPAL);
        const middle11 = hand.getJointMesh(WebXRHandJoint.MIDDLE_FINGER_PHALANX_PROXIMAL);
        const middle12 = hand.getJointMesh(WebXRHandJoint.MIDDLE_FINGER_PHALANX_INTERMEDIATE);
        const middle13 = hand.getJointMesh(WebXRHandJoint.MIDDLE_FINGER_PHALANX_DISTAL);
        const middle14 = hand.getJointMesh(WebXRHandJoint.MIDDLE_FINGER_TIP);
        const ring15 = hand.getJointMesh(WebXRHandJoint.RING_FINGER_METACARPAL);
        const ring16 = hand.getJointMesh(WebXRHandJoint.RING_FINGER_PHALANX_PROXIMAL);
        const ring17 = hand.getJointMesh(WebXRHandJoint.RING_FINGER_PHALANX_INTERMEDIATE);
        const ring18 = hand.getJointMesh(WebXRHandJoint.RING_FINGER_PHALANX_DISTAL);
        const ring19 = hand.getJointMesh(WebXRHandJoint.RING_FINGER_TIP);
        const little20 = hand.getJointMesh(WebXRHandJoint.PINKY_FINGER_METACARPAL);
        const little21 = hand.getJointMesh(WebXRHandJoint.PINKY_FINGER_PHALANX_PROXIMAL);
        const little22 = hand.getJointMesh(WebXRHandJoint.PINKY_FINGER_PHALANX_INTERMEDIATE);
        const little23 = hand.getJointMesh(WebXRHandJoint.PINKY_FINGER_PHALANX_DISTAL);
        const little24 = hand.getJointMesh(WebXRHandJoint.PINKY_FINGER_TIP);

        // 获得index6夹角

        // const angle = Vector3.GetAngleBetweenVectors(line1, line2, normal);

        const wristEa = wristMesh0.rotationQuaternion?.toEulerAngles()!;
        // 手腕
        {
            bone['rightHand'].rotationQuaternion = Quaternion.FromEulerAngles(-wristEa.z, -wristEa.y, -wristEa.x);
        }
        // 拇指
        {
            setModalJointYAxis(bone['rightThumbProximal'], [thumb1, wristMesh0, thumb2]);
            setModalJointYAxis(bone['rightThumbIntermediate'], [thumb2, thumb1, thumb3]);
            setModalJointYAxis(bone['rightThumbDistal'], [thumb3, thumb2, thumb4]);
        }
        // 食指
        {
            setModalJointZAxis(bone['rightIndexProximal'], [index6, index5, index7]);
            setModalJointZAxis(bone['rightIndexIntermediate'], [index7, index6, index8]);
            setModalJointZAxis(bone['rightIndexDistal'], [index8, index7, index9]);
        }
        // 中指
        {
            setModalJointZAxis(bone['rightMiddleProximal'], [middle11, middle10, middle12]);
            setModalJointZAxis(bone['rightMiddleIntermediate'], [middle12, middle11, middle13]);
            setModalJointZAxis(bone['rightMiddleDistal'], [middle13, middle12, middle14]);
        }
        // 无名指
        {
            setModalJointZAxis(bone['rightRingProximal'], [ring16, ring15, ring17]);
            setModalJointZAxis(bone['rightRingIntermediate'], [ring17, ring16, ring18]);
            setModalJointZAxis(bone['rightRingDistal'], [ring18, ring17, ring19]);
        }
        // 小指
        {
            setModalJointZAxis(bone['rightLittleProximal'], [little21, little20, little22]);
            setModalJointZAxis(bone['rightLittleIntermediate'], [little22, little21, little23]);
            setModalJointZAxis(bone['rightLittleDistal'], [little23, little22, little24]);
        }
    }

    function setModalJointZAxis(modalJoint: any, jointsMesh: AbstractMesh[]) {
        modalJoint.rotationQuaternion = Quaternion.FromEulerAngles(0, 0, getAngle(jointsMesh[0], jointsMesh[1], jointsMesh[2]) - Math.PI);
    }

    function setModalJointYAxis(modalJoint: any, jointsMesh: AbstractMesh[]) {
        modalJoint.rotationQuaternion = Quaternion.FromEulerAngles(0, getAngle(jointsMesh[0], jointsMesh[1], jointsMesh[2]) - Math.PI, 0);
    }

    scene.onBeforeRenderObservable.add(() => {
        // if (leftHand && rightHand) console.log('=========', leftHand, rightHand);
        // if (!leftHand || !rightHand) return;

        if (leftHand) {
            // makeLeftHandSync(leftHand);
        }
        if (rightHand) {
            makeRightHandSync(rightHand);
        }
    });

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
        advancedTexture.layer!.layerMask = 2;
        // Matrix

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
            // leftShoulder: Quaternion.FromEulerAngles(0, 0, Math.PI / 4),
            leftShoulder: Quaternion.FromEulerAngles(0, 0, 0),

            leftUpperArm: Quaternion.FromEulerAngles(0, 0, 0),
            // leftLowerArm: Quaternion.FromEulerAngles(0, 0, Math.PI / 4),
            leftLowerArm: Quaternion.FromEulerAngles(0, 0, 0),
            leftHand: Quaternion.FromEulerAngles(0, 0, 0),

            leftThumbProximal: Quaternion.FromEulerAngles(0, 0, 0), // 2
            leftThumbIntermediate: Quaternion.FromEulerAngles(0, 0, 0), // 3
            leftThumbDistal: Quaternion.FromEulerAngles(0, 0, 0), // 4

            leftIndexProximal: Quaternion.FromEulerAngles(0, 0, 0), // 6
            leftIndexIntermediate: Quaternion.FromEulerAngles(0, 0, 0), // 7
            leftIndexDistal: Quaternion.FromEulerAngles(0, 0, 0), // 8

            leftMiddleProximal: Quaternion.FromEulerAngles(0, 0, 0), // 11
            leftMiddleIntermediate: Quaternion.FromEulerAngles(0, 0, 0), // 12
            leftMiddleDistal: Quaternion.FromEulerAngles(0, 0, 0), // 13

            leftRingProximal: Quaternion.FromEulerAngles(0, 0, 0), // 16
            leftRingIntermediate: Quaternion.FromEulerAngles(0, 0, 0), // 17
            leftRingDistal: Quaternion.FromEulerAngles(0, 0, 0), // 18

            leftLittleProximal: Quaternion.FromEulerAngles(0, 0, 0), // 21
            leftLittleIntermediate: Quaternion.FromEulerAngles(0, 0, 0), // 22
            leftLittleDistal: Quaternion.FromEulerAngles(0, 0, 0), // 23

            leftUpperLeg: Quaternion.FromEulerAngles(0, 0, 0),
            leftLowerLeg: Quaternion.FromEulerAngles(0, 0, 0),
            leftFoot: Quaternion.FromEulerAngles(0, 0, 0),

            // 脚趾
            leftToe: Quaternion.FromEulerAngles(0, 0, 0),

            rightEye: Quaternion.FromEulerAngles(0, 0, 0),
            rightShoulder: Quaternion.FromEulerAngles(0, Math.PI / 6, 0),

            rightUpperArm: Quaternion.FromEulerAngles(0, 0, 0),
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
        shadow: href.includes('shadow'),
        inspector: href.includes('inspector'),
    };
}

main().catch((reason) => {
    console.error(reason);
});
