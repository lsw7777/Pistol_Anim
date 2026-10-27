/* CZ 75 B 外观演示：14 个独立组件、组件聚焦、磨损和展示动画。 */
try {
  // ── 场景、相机与照明 ──────────────────────────────────────
  const canvas = document.querySelector('#scene'),
    view = document.querySelector('#viewport');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.useLegacyLights = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  // GLSL 编译失败不会抛出到外层 try/catch，单独记录，下一帧降级恢复画面。
  let shaderFailure = null;
  let shaderFallbackApplied = false;
  renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
    shaderFailure = [gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertexShader),
      gl.getShaderInfoLog(fragmentShader)].filter(Boolean).join('\n');
    console.error('GPU 着色器编译失败：', shaderFailure);
  };
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
  camera.position.set(0, .4, 12);
  scene.add(new THREE.HemisphereLight(0xf0f4ff, 0x8c8174, 1.25));

  function light(x, y, z, power, color, castShadow = false) {
    const directionalLight = new THREE.DirectionalLight(color, power);
    directionalLight.position.set(x, y, z);
    directionalLight.castShadow = castShadow;
    if (castShadow) {
      directionalLight.shadow.mapSize.set(2048, 2048);
      Object.assign(directionalLight.shadow.camera, {
        left: -6, right: 6, top: 5, bottom: -6, near: 0.5, far: 30
      });
      directionalLight.shadow.normalBias = 0.035;
      directionalLight.shadow.bias = -0.00015;
    }
    scene.add(directionalLight);
    return directionalLight;
  }
  light(-3, 5, 6, 4.5, 0xfff2df, true); // 正面主光，提供可见的主体层次。
  light(4, 2, 5, 2.5, 0xe5edff);        // 正面补光，照亮暗色握柄。
  light(2, 4, -5, 4.0, 0xeaf2ff);       // 背部轮廓光。
  light(-4, 1, -3, 1.5, 0xffffff);      // 旋转到另一侧时仍保持可读性。

  // 离线生成线性 HDR 摄影棚环境。亮度允许超过 1，经 PMREM 按粗糙度预过滤。
  // 环境照明同时提供漫反射与 GGX 镜面反射，金属不再只反射几盏小光源。
  function createStudioEnvironment() {
    const width = 512, height = 256;
    const pixels = new Float32Array(width * height * 4);
    const panels = [
      { direction: new THREE.Vector3(-1, 1, 2).normalize(), brightness: 8, spread: 12, tint: [1, 0.95, 0.86] },
      { direction: new THREE.Vector3(1, 0.5, 2).normalize(), brightness: 5, spread: 16, tint: [0.86, 0.93, 1] },
      { direction: new THREE.Vector3(0, 1, -0.3).normalize(), brightness: 6, spread: 9, tint: [1, 1, 1] },
      { direction: new THREE.Vector3(1, 0.5, -2).normalize(), brightness: 5, spread: 16, tint: [0.88, 0.94, 1] }
    ];
    for (let y = 0; y < height; y++) {
      const elevation = (y / (height - 1) - 0.5) * Math.PI;
      for (let x = 0; x < width; x++) {
        const azimuth = (x / width - 0.5) * Math.PI * 2;
        const direction = new THREE.Vector3(
          Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation),
          Math.cos(elevation) * Math.sin(azimuth)
        );
        const offset = (y * width + x) * 4;
        const ambient = 0.35 + Math.max(0, direction.y) * 0.25;
        pixels[offset] = ambient;
        pixels[offset + 1] = ambient;
        pixels[offset + 2] = ambient;
        for (const panel of panels) {
          const radiance = panel.brightness * Math.exp((direction.dot(panel.direction) - 1) * panel.spread);
          for (let channel = 0; channel < 3; channel++) pixels[offset + channel] += radiance * panel.tint[channel];
        }
        pixels[offset + 3] = 1;
      }
    }
    const source = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat, THREE.FloatType);
    source.mapping = THREE.EquirectangularReflectionMapping;
    source.colorSpace = THREE.LinearSRGBColorSpace;
    source.needsUpdate = true;
    const generator = new THREE.PMREMGenerator(renderer);
    const environment = generator.fromEquirectangular(source);
    source.dispose();
    generator.dispose();
    return environment;
  }

  let environmentTarget = null;
  try {
    environmentTarget = createStudioEnvironment();
    scene.environment = environmentTarget.texture;
  } catch (error) {
    console.warn('HDR 环境预过滤不可用，使用主光和补光继续显示模型。', error);
  }

  // 接收真实阴影的哑光台面，为模型提供空间尺度和明暗参照。
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshPhysicalMaterial({ color: 0x46504b, roughness: 0.86, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4.1;
  floor.receiveShadow = true;
  scene.add(floor);
  const gun = new THREE.Group();
  scene.add(gun);
  gun.position.set(-.2, .1, 0);
  const steel = new THREE.MeshPhysicalMaterial({
      color: 0x8b918e,
      metalness: .9,
      roughness: .34,
      envMapIntensity: 1.2,
      clearcoat: 0.12,
      clearcoatRoughness: 0.3
    }),
    dark = new THREE.MeshPhysicalMaterial({
      color: 0x454c49,
      metalness: .75,
      roughness: .42,
      envMapIntensity: 1.2,
      clearcoat: 0.15,
      clearcoatRoughness: 0.38
    }),
    rubber = new THREE.MeshPhysicalMaterial({
      color: 0x353b37,
      metalness: 0,
      roughness: .85,
      ior: 1.5,
      envMapIntensity: 1
    }),
    silver = new THREE.MeshPhysicalMaterial({
      color: 0xabb1a8,
      metalness: .9,
      roughness: .28,
      envMapIntensity: 1.2
    });
  // 每个组件记录：中文名、英文名、标签定位点、拆卸展示偏移。
  const info = [
    ['准星', 'Front sight', [-2.66, 1.24, 0],
      [-.3, .8, 0]
    ],
    ['滑套', 'Slide', [-.3, 1.02, 0],
      [0, 1.15, 0]
    ],
    ['滑套卡榫／分解闩', 'Slide release', [.42, .49, .43],
      [.2, .2, .8]
    ],
    ['照门', 'Rear sight', [1.62, 1.23, 0],
      [.3, .8, 0]
    ],
    ['击锤', 'Hammer', [2.18, .93, 0],
      [.8, .7, 0]
    ],
    ['手动保险', 'Thumb safety', [1.79, .39, .45],
      [.7, .3, .8]
    ],
    ['复进簧导杆', 'Recoil spring rod', [-2.43, .38, 0],
      [-1.1, -.3, 0]
    ],
    ['枪体', 'Frame', [.04, .17, 0],
      [0, 0, 0]
    ],
    ['扳机护弓', 'Trigger guard', [-.45, -.66, 0],
      [-.5, -.45, 0]
    ],
    ['扳机', 'Trigger', [.13, -.31, 0],
      [0, -.25, .7]
    ],
    ['弹匣卡榫', 'Magazine catch', [1.12, -.39, .45],
      [.3, -.2, .8]
    ],
    ['握背', 'Backstrap', [2.19, -1.07, 0],
      [1, 0, 0]
    ],
    ['握柄', 'Grip', [1.75, -1.28, .44],
      [.7, 0, .9]
    ]
  ];
  // 弹匣作为第 14 个独立组件，参与换弹和拆装动画。
  info.push(['弹匣', 'Magazine', [1.94, -2.2, 0],
    [0, -1.4, 0]
  ]);
  const groups = info.map((d, i) => {
    let g = new THREE.Group();
    g.userData = {
      index: i
    };
    gun.add(g);
    return g
  });

  // ── 几何构建工具与模型 ────────────────────────────────────
  function mesh(group, geometry, material, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, material.clone());
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    group.add(object);
    return object;
  }

  function box(g, w, h, d, x, y, z, mat = steel) {
    return mesh(g, new THREE.BoxGeometry(w, h, d), mat, x, y, z)
  }

  function shape(g, points, depth, mat = steel, z = 0, holes = []) {
    const s = new THREE.Shape();
    points.forEach((p, i) => i ? s.lineTo(...p) : s.moveTo(...p));
    s.closePath();
    holes.forEach(ps => {
      let h = new THREE.Path();
      ps.forEach((p, i) => i ? h.lineTo(...p) : h.moveTo(...p));
      h.closePath();
      s.holes.push(h)
    });
    return mesh(g, new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: .035,
      bevelThickness: .035
    }), mat, 0, 0, z - depth / 2)
  }

  function cylinder(g, r, len, x, y, z, mat = steel, axis = 'x') {
    const m = mesh(g, new THREE.CylinderGeometry(r, r, len, 40), mat, x, y, z);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    return m
  }

  function tube(g, points, r, mat = steel) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(g, new THREE.TubeGeometry(curve, 48, r, 10, false), mat)
  }
  shape(groups[1], [
    [-2.85, .7],
    [-2.9, 1.02],
    [-2.74, 1.17],
    [1.94, 1.17],
    [2.16, 1.05],
    [2.17, .7]
  ], .65);
  box(groups[1], 4.95, .075, .69, -.29, .79, 0, dark);
  box(groups[1], 4.85, .055, .69, -.28, 1.06, 0, silver);
  for (let z of [-.355, .355]) {
    for (let i = 0; i < 9; i++) {
      let m = box(groups[1], .047, .29, .015, 1.08 + i * .085, .93, z, dark);
      m.rotation.z = .19
    }
    box(groups[1], .73, .16, .025, .59, .94, z, dark)
  }
  // Hollow muzzle and barrel lip, visible from the front.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.185, .048, 12, 48), silver);
  ring.rotation.y = Math.PI / 2;
  ring.position.set(-2.91, .94, 0);
  groups[1].add(ring);
  cylinder(groups[1], .145, .018, -2.916, .94, 0, rubber);
  cylinder(groups[1], .185, 1, -2.35, .94, 0, dark);
  shape(groups[0], [
    [-2.77, 1.17],
    [-2.76, 1.35],
    [-2.61, 1.36],
    [-2.57, 1.17]
  ], .15, dark);
  box(groups[0], .045, .035, .12, -2.665, 1.355, 0, silver);
  box(groups[3], .36, .08, .46, 1.64, 1.2, 0, dark);
  box(groups[3], .16, .15, .11, 1.67, 1.29, -.17, dark);
  box(groups[3], .16, .15, .11, 1.67, 1.29, .17, dark);
  shape(groups[7], [
    [-2.78, .69],
    [1.94, .68],
    [2.14, .4],
    [2.15, .02],
    [1.96, -.08],
    [1.49, -.15],
    [1.16, -.27],
    [.97, -.04],
    [.72, .19],
    [-.25, .3],
    [-1.48, .29],
    [-1.58, .4],
    [-2.77, .4]
  ], .62);
  box(groups[7], 1.16, .16, .55, -2.15, .5, 0);
  cylinder(groups[6], .065, 1.22, -2.24, .39, 0, silver);
  cylinder(groups[6], .095, .055, -2.86, .39, 0, dark);
  shape(groups[8], [
    [-.91, .27],
    [-1.02, .02],
    [-1.04, -.63],
    [-.77, -.87],
    [.42, -.89],
    [.87, -.62],
    [1.02, -.12],
    [.77, .24]
  ], .42, steel, 0, [
    [
      [-.73, .08],
      [.64, .1],
      [.81, -.12],
      [.67, -.56],
      [.35, -.7],
      [-.65, -.7],
      [-.86, -.52],
      [-.85, -.12]
    ]
  ]);
  tube(groups[9], [
    [.23, .21, 0],
    [.34, .03, 0],
    [.28, -.23, 0],
    [.08, -.43, 0]
  ], .062, dark);
  shape(groups[11], [
    [1.25, .14],
    [1.99, .18],
    [2.22, -.15],
    [2.57, -2.08],
    [2.46, -2.22],
    [2.23, -2.19],
    [1.94, -.55]
  ], .57, dark);
  shape(groups[12], [
    [1.22, -.11],
    [1.94, -.13],
    [2.12, -.32],
    [2.46, -2.08],
    [1.57, -2.1],
    [1.25, -.64]
  ], .65, dark);
  for (let side of [-1, 1]) {
    shape(groups[12], [
      [1.37, -.25],
      [1.93, -.25],
      [2.06, -.46],
      [2.34, -1.97],
      [1.66, -1.99],
      [1.38, -.62]
    ], .065, rubber, side * .36);
    for (let row = 0; row < 31; row++)
      for (let col = 0; col < 10; col++) {
        const y = -.46 - row * .044,
          x = 1.46 + col * .051 + row * .008;
        if (x < 2.04 + row * .008) cylinder(groups[12], .009, .008, x, y, side * .403, steel, 'z')
      }
    cylinder(groups[12], .08, .015, 1.66, -.47, side * .417, dark, 'z');
    cylinder(groups[12], .08, .015, 2.05, -1.77, side * .417, dark, 'z')
  }
  shape(groups[13], [
    [1.63, -.9],
    [2.12, -.88],
    [2.4, -2.2],
    [1.86, -2.27]
  ], .42, steel);
  box(groups[13], 1, .1, .72, 2, -2.22, 0, dark);
  for (let side of [-1, 1]) {
    cylinder(groups[10], .105, .07, 1.12, -.34, side * .355, dark, 'z');
    cylinder(groups[2], .085, .06, .64, .5, side * .35, dark, 'z');
    box(groups[2], .57, .1, .09, .39, .51, side * .38, dark);
    shape(groups[5], [
      [1.45, .52],
      [1.94, .53],
      [2.02, .44],
      [1.96, .3],
      [1.47, .31]
    ], .06, dark, side * .36);
    box(groups[5], .28, .04, .09, 1.75, .48, side * .4, steel)
  }
  shape(groups[4], [
    [1.99, .83],
    [2.2, 1.05],
    [2.42, 1.02],
    [2.41, .88],
    [2.18, .74]
  ], .23, dark);
  for (let i = 0; i < 5; i++) box(groups[4], .03, .035, .25, 2.22 + i * .038, 1.03, 0, steel);
  const stamp = document.createElement('canvas');
  stamp.width = 1024;
  stamp.height = 128;
  const ctx = stamp.getContext('2d');
  ctx.fillStyle = '#777e76';
  ctx.fillRect(0, 0, 1024, 128);
  ctx.fillStyle = '#242b24';
  ctx.font = '52px Georgia';
  ctx.fillText('CZ 75 B', 55, 76);
  ctx.font = '21px sans-serif';
  ctx.fillText('CAL. 9 LUGER', 370, 74);
  const texture = new THREE.CanvasTexture(stamp);
  texture.colorSpace = THREE.SRGBColorSpace;
  mesh(groups[1], new THREE.PlaneGeometry(1.5, .18), new THREE.MeshPhysicalMaterial({
    map: texture,
    metalness: .5,
    roughness: .5
  }), -.31, .96, .361);

  // ── 组件介绍、交互状态和按钮事件 ──────────────────────────
  const descriptions = [
    '位于滑套前端，与照门共同构成机械瞄准视线。',
    '枪体上方的金属外壳。演示中可观察它的往复运动、刻字与防滑槽。',
    '位于枪体侧面的控制件。本模型展示其外形和与枪体的相对位置。',
    '位于滑套后端，与前方准星配合形成瞄准基准。',
    '位于枪体后上方的击发机构外露部件。开火演示中可观察其短暂运动。',
    '位于枪体后部侧面的保险控制件，模型用于展示外观位置。',
    '位于滑套前部下方，为复进机构提供导向。拆卸演示中单独展开。',
    '连接和承载各组件的主体结构，包含滑套下方的支撑部分。',
    '环绕扳机的保护结构，形成清晰的封闭轮廓。',
    '位于护弓内部的控制件，开火演示中呈现短暂的后移。',
    '位于握柄前上方的弹匣固定控制件。',
    '握柄后侧的轮廓结构，形成手掌接触的背部曲面。',
    '带有防滑纹理与固定螺钉的握持区域，磨损控制可改变其表面质感。',
    '收纳在握柄内部的独立组件，换弹演示中可观察其移出与回位。'
  ];
  let auto = true,
    exploded = false,
    yaw = .08,
    pitch = .06,
    zoom = 12,
    selected = -1,
    hovered = -1,
    drag = false,
    prev = {
      x: 0,
      y: 0
    },
    progress = 0,
    action = null,
    wear = .28;
  const target = new THREE.Vector3(0, .1, 0),
    desiredTarget = target.clone();
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2(2, 2);
  const status = document.querySelector('#animation-status'),
    popup = document.querySelector('#component-popup');
  function updateExposure(value) {
    renderer.toneMappingExposure = THREE.MathUtils.clamp(value, 0.8, 2.2);
    document.querySelector('#exposure-value').textContent = renderer.toneMappingExposure.toFixed(2);
  }
  document.querySelector('#exposure').oninput = event => updateExposure(Number(event.target.value) / 100);
  updateExposure(1.45);
  document.querySelector('.panel-heading span').textContent = '14 / 14';
  const labelEls = info.map((d, i) => {
    const el = document.createElement('button');
    el.className = 'label';
    el.textContent = d[0];
    el.style.display = 'none';
    el.onclick = () => select(i);
    el.onpointerenter = () => hovered = i;
    el.onpointerleave = () => {
      if (!drag) hovered = -1
    };
    document.querySelector('#labels').append(el);
    const b = document.createElement('button');
    b.className = 'part';
    b.innerHTML = '<em>' + String(i + 1).padStart(2, '0') + '</em>' + d[0] + '<small>' + d[1] +
      '</small>';
    b.onclick = () => select(i);
    document.querySelector('#parts').append(b);
    return el
  });

  function setAuto(value) {
    auto = value;
    const b = document.querySelector('#rotate');
    b.textContent = auto ? '暂停旋转' : '自动旋转';
    b.classList.toggle('active', auto)
  }

  function select(i) {
    selected = i;
    setAuto(false);
    zoom = 6;
    document.querySelectorAll('.part').forEach((b, j) => b.classList.toggle('selected', j === i));
    labelEls.forEach((b, j) => b.classList.toggle('selected', j === i));
    document.querySelector('#component-title').textContent = info[i][0];
    document.querySelector('#component-english').textContent = info[i][1];
    document.querySelector('#component-description').textContent = descriptions[i];
    popup.hidden = false;
    document.querySelector('#detail').textContent = '已聚焦：' + info[i][0] + '。拖动可从不同方向观察，关闭介绍返回全景。';
  }

  function clearSelection() {
    selected = -1;
    popup.hidden = true;
    desiredTarget.set(0, .1, 0);
    zoom = 12;
    document.querySelectorAll('.part,.label').forEach(b => b.classList.remove('selected'));
    document.querySelector('#detail').textContent = '悬浮组件显示标签，点击标签或索引聚焦并查看介绍。';
  }
  document.querySelector('#close-detail').onclick = clearSelection;
  document.querySelector('#rotate').onclick = () => setAuto(!auto);

  function startAction(name) {
    if (action) return;
    clearSelection();
    setAuto(false);
    if ((name === 'fire' || name === 'reload') && (exploded || progress > .01)) {
      status.textContent = '请先组装模型，再播放此动画。';
      return
    }
    action = {
      name,
      start: performance.now(),
      duration: {
        fire: 750,
        reload: 2600,
        disassemble: 2400,
        assemble: 2400
      } [name],
      from: progress
    };
    if (name === 'disassemble') exploded = true;
    if (name === 'assemble') exploded = false;
    document.querySelectorAll('[data-action]').forEach(b => {
      b.disabled = true;
      b.classList.toggle('active', b.dataset.action === name)
    });
    status.textContent = {
      fire: '开火演示中',
      reload: '换弹演示中',
      disassemble: '拆卸演示中',
      assemble: '组装演示中'
    } [name];
  }
  document.querySelectorAll('[data-action]').forEach(b => b.onclick = () => startAction(b.dataset
    .action));
  document.querySelector('#reset').onclick = () => {
    action = null;
    progress = 0;
    exploded = false;
    yaw = .08;
    pitch = .06;
    hovered = -1;
    clearSelection();
    setAuto(false);
    document.querySelectorAll('[data-action]').forEach(b => {
      b.disabled = false;
      b.classList.remove('active')
    });
    status.textContent = '外观动画演示 · 拆装为示意位移';
  };
  // ── 磨损：程序化表面着色与可逆几何变形 ────────────────────
  // 磨损使用模型坐标，划痕和污渍不会随镜头、拆装或滑动条随机跳动。
  // 颜色、粗糙度、金属度分别处理：掉漆露出亮金属，污渍呈暗哑色。
  const wearUniform = {
    value: wear
  };
  const wornMeshes = [];
  const wearShader = `
uniform float uWear;
uniform float uIsMetal;
varying vec3 vWearPosition;
varying vec3 vWearNormal;

float wearHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float wearNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wearHash(cell), wearHash(cell + vec2(1, 0)), f.x),
             mix(wearHash(cell + vec2(0, 1)), wearHash(cell + vec2(1, 1)), f.x), f.y);
}

// 返回划痕、涂层剥落、污渍三个独立遮罩。
vec3 wearMasks(vec2 p) {
  vec2 scratchUV = vec2(p.x + p.y * 0.32, p.y) * vec2(4.0, 52.0);
  vec2 cell = floor(scratchUV);
  vec2 f = fract(scratchUV);
  float seed = wearHash(cell);
  float line = 1.0 - smoothstep(0.025, 0.10, abs(f.y - 0.5));
  float ends = smoothstep(0.02, 0.18, f.x) * (1.0 - smoothstep(0.68, 0.96, f.x));
  float scratches = line * ends * step(seed, uWear * 0.85) * smoothstep(0.0, 0.15, uWear);

  float wearPatch = wearNoise(p * 8.0) * 0.65 + wearNoise(p * 31.0) * 0.35;
  float chips = smoothstep(0.77 - uWear * 0.42, 0.83 - uWear * 0.42, wearPatch);
  chips *= smoothstep(0.12, 0.65, uWear);

  float grime = wearNoise(p * 3.2 + vec2(13.0, 7.0));
  float dirt = smoothstep(0.62 - uWear * 0.25, 0.84 - uWear * 0.25, grime);
  dirt *= uWear;
  return vec3(scratches, chips, dirt);
}
`;

  // 对主体表面三角形细分，凹陷能出现在面内，而不只是移动轮廓顶点。
  // 同时插值 UV 和法线，保持刻字、硬边与原有材质的对应关系。
  function subdivideWearGeometry(source) {
    let geometry = source.index ? source.toNonIndexed() : source.clone();
    for (let level = 0; level < 2; level++) {
      const refined = new THREE.BufferGeometry();
      for (const [name, attribute] of Object.entries(geometry.attributes)) {
        const width = attribute.itemSize;
        const values = [];
        for (let triangle = 0; triangle < attribute.count; triangle += 3) {
          const vertices = [0, 1, 2].map((vertex) =>
            Array.from(attribute.array.slice((triangle + vertex) * width, (triangle + vertex +
              1) * width))
          );
          const midpoint = (a, b) => a.map((value, i) => (value + b[i]) / 2);
          const [a, b, c] = vertices;
          const ab = midpoint(a, b),
            bc = midpoint(b, c),
            ca = midpoint(c, a);
          for (const vertex of [a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca]) values.push(...
          vertex);
        }
        refined.setAttribute(name, new THREE.Float32BufferAttribute(values, width));
      }
      geometry.dispose();
      geometry = refined;
    }
    geometry.normalizeNormals();
    return geometry;
  }

  function installWearMaterial(object) {
    const material = object.material;
    if (!material || !material.isMeshStandardMaterial) return;
    // 铭文保留原始贴图，在其上叠加磨损；无需为每个零件生成纹理。
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWear = wearUniform;
      shader.uniforms.uIsMetal = {
        value: material.metalness > 0.6 ? 1 : 0
      };
      shader.uniforms.uWearOffset = {
        value: object.position.clone()
      };
      shader.vertexShader = `varying vec3 vWearPosition;
varying vec3 vWearNormal;
uniform vec3 uWearOffset;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvWearPosition = position + uWearOffset;\nvWearNormal = normal;'
      );
      shader.fragmentShader = wearShader + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
      vec3 weights = pow(abs(normalize(vWearNormal)), vec3(6.0));
      weights /= max(weights.x + weights.y + weights.z, 0.0001);
      vec3 damage = wearMasks(vWearPosition.yz) * weights.x
                  + wearMasks(vWearPosition.xz) * weights.y
                  + wearMasks(vWearPosition.xy) * weights.z;
      vec3 exposed = mix(vec3(0.30, 0.24, 0.16), vec3(0.62, 0.65, 0.61), uIsMetal);
      diffuseColor.rgb = mix(diffuseColor.rgb, exposed, damage.y * 0.92);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.065, 0.048, 0.028), damage.z * 0.65);
      diffuseColor.rgb = mix(diffuseColor.rgb, exposed * 1.25, damage.x * 0.95);`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.92, damage.z);
      roughnessFactor = mix(roughnessFactor, mix(0.9, 0.35, uIsMetal), max(damage.x, damage.y));`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
      metalnessFactor = mix(metalnessFactor, uIsMetal * 0.9, damage.y);
      metalnessFactor *= 1.0 - damage.z * 0.8;`
      );
      // 掉漆与污渍会破坏表面的保护层，避免旧枪仍像均匀上光的塑料。
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
          material.clearcoat *= 1.0 - max(damage.y, damage.z) * 0.9;
        #endif`
      );
    };
    material.customProgramCacheKey = () => 'gun-wear-physical-v3';
    material.needsUpdate = true;

    let geometry = object.geometry;
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    // 只变形主体，避免微小螺钉、防滑点和铭文平面被拉扯。
    if (Math.max(size.x, size.y, size.z) > 0.45 && geometry.type !== 'PlaneGeometry') {
      if (geometry.type === 'ExtrudeGeometry' || geometry.type === 'BoxGeometry') {
        object.geometry = subdivideWearGeometry(geometry);
        geometry.dispose();
        geometry = object.geometry;
        geometry.computeBoundingBox();
      }
      wornMeshes.push({
        object,
        originalPositions: geometry.attributes.position.array.slice(),
        originalNormals: geometry.attributes.normal.array.slice(),
        size,
        center: geometry.boundingBox.getCenter(new THREE.Vector3()),
      });
    }
  }

  gun.traverse(installWearMaterial);

  function updateWear(value) {
    wear = THREE.MathUtils.clamp(value, 0, 1);
    wearUniform.value = wear;
    // 高磨损出现凹陷和轮廓轻微弯曲，拖回 0% 恢复原始顶点与法线。
    const deformation = Math.pow(Math.max(0, (wear - 0.35) / 0.65), 1.5);
    wornMeshes.forEach(({
      object,
      originalPositions,
      originalNormals,
      size,
      center
    }) => {
      const geometry = object.geometry;
      const positions = geometry.attributes.position;
      const extent = Math.max(size.x, size.y, size.z);
      for (let i = 0; i < positions.count; i++) {
        const offset = i * 3;
        const x = originalPositions[offset];
        const y = originalPositions[offset + 1];
        const z = originalPositions[offset + 2];
        const nx = (x - center.x) / Math.max(size.x, 0.01);
        const ny = (y - center.y) / Math.max(size.y, 0.01);
        const dent = Math.exp(-((nx - 0.22) ** 2 + (ny + 0.15) ** 2) * 22);
        const depth = deformation * Math.min(0.13, extent * 0.065) * dent;
        positions.setXYZ(
          i,
          x - originalNormals[offset] * depth,
          y - originalNormals[offset + 1] * depth + deformation * 0.045 * nx * nx,
          z - originalNormals[offset + 2] * depth + deformation * 0.065 * Math.sin(nx * 5 +
            ny * 2)
        );
      }
      positions.needsUpdate = true;
      if (wear === 0) {
        geometry.attributes.normal.array.set(originalNormals);
        geometry.attributes.normal.needsUpdate = true;
      } else {
        geometry.computeVertexNormals();
      }
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    });
    document.querySelector('#wear-value').textContent = Math.round(wear * 100) + '%';
  }
  document.querySelector('#wear').oninput = e => updateWear(Number(e.target.value) / 100);
  updateWear(wear);
  // ── 枪口闪光和鼠标操作 ────────────────────────────────────
  const flash = new THREE.Group();
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd78b,
    transparent: true,
    opacity: .9,
    depthWrite: false
  });
  const flare = new THREE.Mesh(new THREE.ConeGeometry(.26, .85, 12), flashMaterial);
  flare.rotation.z = Math.PI / 2;
  flash.add(flare);
  flash.position.set(-3.3, .94, 0);
  flash.visible = false;
  gun.add(flash);
  const flashLight = new THREE.PointLight(0xffbd62, 0, 4, 2); // 平方反比衰减。
  flashLight.position.set(-3, .94, 0);
  gun.add(flashLight);
  canvas.onpointerdown = e => {
    drag = true;
    prev = {
      x: e.clientX,
      y: e.clientY
    };
    canvas.setPointerCapture(e.pointerId);
    setAuto(false)
  };
  canvas.onpointerup = () => drag = false;
  canvas.onpointercancel = () => drag = false;
  canvas.onpointerleave = () => {
    hovered = -1;
    pointer.set(2, 2)
  };
  canvas.onpointermove = e => {
    const r = canvas.getBoundingClientRect();
    pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    if (!drag) return;
    yaw += (e.clientX - prev.x) * .008;
    pitch = Math.max(-1.15, Math.min(1.15, pitch + (e.clientY - prev.y) * .006));
    prev = {
      x: e.clientX,
      y: e.clientY
    }
  };
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    zoom = Math.max(4, Math.min(19, zoom + e.deltaY * .008))
  }, {
    passive: false
  });
  const smooth = t => t * t * (3 - 2 * t);
  // ── 帧更新：动画、相机过渡、悬浮拾取与标签投影 ────────────
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    if (shaderFailure !== null && !shaderFallbackApplied) {
      shaderFallbackApplied = true;
      // 去掉兼容性有问题的扩展，保留物理材质、主光与补光以显示模型。
      gun.traverse(object => {
        if (!object.material?.isMeshStandardMaterial) return;
        object.material.onBeforeCompile = () => {};
        object.material.customProgramCacheKey = () => 'gun-physical-fallback';
        object.material.needsUpdate = true;
      });
      scene.environment = null;
      status.textContent = 'GPU 材质兼容性异常，已切换基础物理材质。';
    }
    let dt = Math.min((now - last) / 1000, .05);
    last = now;
    if (auto && !drag) yaw += dt * .18;
    let recoil = 0,
      magazine = 0,
      trigger = 0;
    if (action) {
      const t = Math.min(1, (now - action.start) / action.duration);
      if (action.name === 'disassemble' || action.name === 'assemble') {
        const end = action.name === 'disassemble' ? 1 : 0;
        progress = action.from + (end - action.from) * smooth(t)
      }
      if (action.name === 'fire') {
        recoil = Math.sin(Math.min(1, t / .65) * Math.PI) * .42;
        trigger = Math.sin(t * Math.PI) * .08;
        flash.visible = t < .17;
        flash.scale.setScalar(.8 + Math.sin(t * 70) * .2);
        flashLight.intensity = t < .17 ? 5 : 0;
      }
      if (action.name === 'reload') {
        magazine = t < .42 ? smooth(t / .42) : t < .58 ? 1 : 1 - smooth((t - .58) / .42)
      }
      if (t === 1) {
        action = null;
        flash.visible = false;
        flashLight.intensity = 0;
        document.querySelectorAll('[data-action]').forEach(b => {
          b.disabled = false;
          b.classList.remove('active')
        });
        status.textContent = exploded ? '拆卸完成 · 可悬浮查看独立组件' : '动画完成 · 模型已回位';
      }
    }
    gun.rotation.set(pitch, yaw, 0);
    gun.position.x = -.2 + recoil * .16;
    const w = view.clientWidth,
      h = view.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(
        h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix()
    }
    groups.forEach((g, i) => {
      g.position.fromArray(info[i][3]).multiplyScalar(progress);
      if ([0, 1, 3].includes(i)) g.position.x += recoil;
      if (i === 13) {
        g.position.y -= magazine * 2.6;
        g.position.x -= magazine * .4
      }
      if (i === 9) g.position.x += trigger;
      if (i === 4) g.position.y -= trigger;
      g.children.forEach(m => {
        if (m.material && m.material.emissive) m.material.emissive.setHex(selected === i ?
          0x293513 : hovered === i ? 0x15200b : 0)
      })
    });
    gun.updateMatrixWorld(true);
    if (selected >= 0) {
      desiredTarget.fromArray(info[selected][2]).add(groups[selected].position);
      gun.localToWorld(desiredTarget)
    }
    target.lerp(desiredTarget, 1 - Math.exp(-dt * 5));
    camera.position.lerp(new THREE.Vector3(target.x, target.y + .3, target.z + zoom), 1 - Math.exp(-
      dt * 5));
    camera.lookAt(target);
    camera.updateMatrixWorld();
    if (!drag) {
      const labelHover = labelEls.findIndex(el => el.matches(':hover'));
      if (labelHover >= 0) {
        hovered = labelHover
      } else {
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(groups, true)[0];
        if (hit) {
          let obj = hit.object;
          while (obj.parent && obj.userData.index === undefined) obj = obj.parent;
          hovered = obj.userData.index ?? -1
        } else hovered = -1;
      }
    }
    labelEls.forEach((el, i) => {
      const v = new THREE.Vector3(...info[i][2]).add(groups[i].position);
      gun.localToWorld(v);
      v.project(camera);
      el.style.left = (v.x * .5 + .5) * w + 'px';
      el.style.top = (-v.y * .5 + .5) * h - 18 + 'px';
      el.style.display = !drag && hovered === i && v.z > -1 && v.z < 1 && Math.abs(v.x) < 1 &&
        Math.abs(v.y) < 1 ? 'block' : 'none';
    });
    renderer.render(scene, camera)
  }
  requestAnimationFrame(frame);
  window.modelStudy = {
    componentCount: groups.length,
    scene,
    renderer,
    camera,
    groups,
    select,
    startAction,
    updateWear,
    updateExposure,
    get state() {
      return {
        selected,
        hovered,
        progress,
        wear,
        action: action?.name
      }
    }
  };
} catch (e) {
  document.querySelector('#error').hidden = false;
  console.error(e)
}
