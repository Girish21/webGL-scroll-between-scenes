import './style.css'

import gsap from 'gsap'
import GUI from 'lil-gui'
import * as THREE from 'three'
import { Lethargy } from 'lethargy'

import fragmentShader from './shader/fragment.frag?raw'
import vertexShader from './shader/vertex.vert?raw'

import redMatcap from './assets/red.png'
import greenMatcap from './assets/green.png'
import grayMatcap from './assets/gray.png'
import { WheelGesture } from '@use-gesture/vanilla'

const scenesData = [
  {
    matcap: redMatcap,
  },
  {
    matcap: greenMatcap,
  },
  {
    matcap: grayMatcap,
  },
]

class Sketch {
  private canvas: HTMLCanvasElement
  private domElement: HTMLElement
  private windowSize: THREE.Vector2
  private renderer: THREE.WebGLRenderer
  // private scene: THREE.Scene
  private postScene: THREE.Scene | null
  private camera: THREE.PerspectiveCamera
  private orthoCamera: THREE.OrthographicCamera | null
  private material: THREE.ShaderMaterial | null = null
  private clock: THREE.Clock
  private scenes: THREE.Scene[]
  private renderTargets: THREE.WebGLRenderTarget[]
  private textureLoader: THREE.TextureLoader

  private gui: GUI
  private current: number = 0
  private transitioning: boolean = false

  config = {
    animate: true,
    progress: 0,
  }

  constructor(el: HTMLElement) {
    this.domElement = el

    this.postScene = null
    this.orthoCamera = null
    this.textureLoader = new THREE.TextureLoader()

    this.windowSize = new THREE.Vector2(
      this.domElement.offsetWidth,
      this.domElement.offsetHeight,
    )

    // this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.windowSize.x / this.windowSize.y,
      0.1,
      100,
    )
    this.camera.position.z = 5
    // this.scene.add(this.camera)

    this.clock = new THREE.Clock()

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.domElement.id = 'three-canvas'
    this.canvas = this.renderer.domElement
    this.domElement.append(this.renderer.domElement)

    this.scenes = scenesData.map(data => this.createScene(data))
    this.scenes.forEach(scene => {
      this.renderer.compile(scene, this.camera)
    })
    this.renderTargets = this.scenes.map(
      _ =>
        new THREE.WebGLRenderTarget(this.windowSize.x, this.windowSize.y, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
        }),
    )

    this.gui = new GUI()

    this.addGUI()
    this.initPost()
    this.addEventListener()
    this.resize()
    this.render()
  }

  createScene(data: { matcap: string }) {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32)
    const material = new THREE.MeshMatcapMaterial({
      matcap: this.textureLoader.load(data.matcap),
    })
    const mesh = new THREE.Mesh(geometry, material)
    const scene = new THREE.Scene()

    for (let i = 0; i < 50; i++) {
      const direction = new THREE.Vector3().randomDirection().multiplyScalar(2)
      const clone = mesh.clone()
      clone.position.copy(direction)
      scene.add(clone)
    }

    return scene
  }

  initPost() {
    this.postScene = new THREE.Scene()

    this.orthoCamera = new THREE.OrthographicCamera(
      -1 / 2,
      1 / 2,
      1 / 2,
      -1 / 2,
      -1000,
      1000,
    )
    // this.orthoCamera.position.z = 5
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uTexture1: { value: this.textureLoader.load(redMatcap) },
        uTexture2: { value: this.textureLoader.load(grayMatcap) },
      },
      fragmentShader,
      vertexShader,
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material)

    this.postScene.add(quad)
  }

  addGUI() {
    this.gui.add(this.config, 'animate').name('Animate')
    // this.gui.add(this.config, 'progress', 0, 1, 0.01).name('Progress')
  }

  resize() {
    this.windowSize.set(
      this.domElement.offsetWidth,
      this.domElement.offsetHeight,
    )

    this.camera.aspect = this.windowSize.x / this.windowSize.y
    this.camera.updateProjectionMatrix()

    this.orthoCamera!.left = -1 / 2
    this.orthoCamera!.right = 1 / 2
    this.orthoCamera!.top = 1 / 2
    this.orthoCamera!.bottom = -1 / 2
    this.orthoCamera!.updateProjectionMatrix()

    this.renderer.setSize(this.windowSize.x, this.windowSize.y)
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
  }

  addEventListener() {
    window.addEventListener('resize', this.resize.bind(this))

    const lethargy = new Lethargy()
    new WheelGesture(this.canvas!, ({ event }) => {
      const dir = lethargy.check(event)
      if (dir && !this.transitioning) {
        console.log('wheel', dir)
        this.transitioning = true
        gsap.to(this.config, {
          progress: 1,
          duration: 1.5,
          ease: 'power4.inOut',
          onComplete: () => {
            this.transitioning = false
            this.current = Math.abs(this.current + 1) % this.scenes.length
            this.config.progress = 0
          },
        })
      }
    })
  }

  render() {
    const elapsedTime = this.clock.getElapsedTime()
    console.log(this.current)
    const next = (this.current + 1) % this.scenes.length

    this.renderer.setRenderTarget(this.renderTargets[this.current])
    this.renderer.render(this.scenes[this.current], this.camera)

    this.renderer.setRenderTarget(this.renderTargets[next])
    this.renderer.render(this.scenes[next], this.camera)

    this.renderer.setRenderTarget(null)

    this.material!.uniforms.uTime.value = elapsedTime
    this.material!.uniforms.uTexture1.value =
      this.renderTargets[this.current].texture
    this.material!.uniforms.uTexture2.value = this.renderTargets[next].texture
    this.material!.uniforms.uProgress.value = this.config.progress

    this.scenes[this.current].rotation.y = elapsedTime * 0.1
    this.scenes[next].rotation.y = elapsedTime * 0.1

    this.renderer.render(this.postScene!, this.orthoCamera!)

    window.requestAnimationFrame(this.render.bind(this))
  }
}

new Sketch(document.getElementById('app')!)
