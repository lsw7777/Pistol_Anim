/* Exterior study: all 14 reference labels represented as independent groups. */
try {
const canvas=document.querySelector('#scene'),view=document.querySelector('#viewport');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(0,.4,12);
scene.add(new THREE.HemisphereLight(0xe4f0dc,0x29352e,2));function light(x,y,z,power,color){const l=new THREE.DirectionalLight(color,power);l.position.set(x,y,z);scene.add(l)}light(-4,7,5,3,0xffffff);light(4,3,-5,4,0xb3caa1);light(-5,-1,-3,1,0xffffff);
const gun=new THREE.Group();scene.add(gun);gun.position.set(-.2,.1,0);
const steel=new THREE.MeshStandardMaterial({color:0x717973,metalness:.82,roughness:.31}),dark=new THREE.MeshStandardMaterial({color:0x242a26,metalness:.7,roughness:.4}),rubber=new THREE.MeshStandardMaterial({color:0x191d1b,roughness:.9}),silver=new THREE.MeshStandardMaterial({color:0xabb1a8,metalness:.9,roughness:.25});
const info=[['准星','Front sight',[-2.66,1.24,0],[-.3,.8,0]],['滑套','Slide',[-.3,1.02,0],[0,1.15,0]],['滑套卡榫／分解闩','Slide release',[.42,.49,.43],[.2,.2,.8]],['照门','Rear sight',[1.62,1.23,0],[.3,.8,0]],['击锤','Hammer',[2.18,.93,0],[.8,.7,0]],['手动保险','Thumb safety',[1.79,.39,.45],[.7,.3,.8]],['复进簧导杆','Recoil spring rod',[-2.43,.38,0],[-1.1,-.3,0]],['枪体','Frame',[.04,.17,0],[0,0,0]],['扳机护弓','Trigger guard',[-.45,-.66,0],[-.5,-.45,0]],['扳机','Trigger',[.13,-.31,0],[0,-.25,.7]],['弹匣卡榫','Magazine catch',[1.12,-.39,.45],[.3,-.2,.8]],['握背','Backstrap',[2.19,-1.07,0],[1,0,0]],['握柄','Grip',[1.75,-1.28,.44],[.7,0,.9]]];
// Magazine is integrated as an additional separate piece; the index groups grip and magazine for the 13-reference-label count.
info.push(['弹匣','Magazine',[1.94,-2.2,0],[0,-1.4,0]]);
const groups=info.map((d,i)=>{let g=new THREE.Group();g.userData={index:i};gun.add(g);return g});
function mesh(g,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat.clone());m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
function box(g,w,h,d,x,y,z,mat=steel){return mesh(g,new THREE.BoxGeometry(w,h,d),mat,x,y,z)}
function shape(g,points,depth,mat=steel,z=0,holes=[]){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();holes.forEach(ps=>{let h=new THREE.Path();ps.forEach((p,i)=>i?h.lineTo(...p):h.moveTo(...p));h.closePath();s.holes.push(h)});return mesh(g,new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035}),mat,0,0,z-depth/2)}
function cylinder(g,r,len,x,y,z,mat=steel,axis='x'){const m=mesh(g,new THREE.CylinderGeometry(r,r,len,40),mat,x,y,z);if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;return m}
function tube(g,points,r,mat=steel){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(g,new THREE.TubeGeometry(curve,48,r,10,false),mat)}
shape(groups[1],[[-2.85,.7],[-2.9,1.02],[-2.74,1.17],[1.94,1.17],[2.16,1.05],[2.17,.7]],.65);
box(groups[1],4.95,.075,.69,-.29,.79,0,dark);box(groups[1],4.85,.055,.69,-.28,1.06,0,silver);
for(let z of [-.355,.355]){for(let i=0;i<9;i++){let m=box(groups[1],.047,.29,.015,1.08+i*.085,.93,z,dark);m.rotation.z=.19}box(groups[1],.73,.16,.025,.59,.94,z,dark)}
// Hollow muzzle and barrel lip, visible from the front.
const ring=new THREE.Mesh(new THREE.TorusGeometry(.185,.048,12,48),silver);ring.rotation.y=Math.PI/2;ring.position.set(-2.91,.94,0);groups[1].add(ring);cylinder(groups[1],.145,.018,-2.916,.94,0,rubber);cylinder(groups[1],.185,1,-2.35,.94,0,dark);
shape(groups[0],[[-2.77,1.17],[-2.76,1.35],[-2.61,1.36],[-2.57,1.17]],.15,dark);
box(groups[0],.045,.035,.12,-2.665,1.355,0,silver);
box(groups[3],.36,.08,.46,1.64,1.2,0,dark);box(groups[3],.16,.15,.11,1.67,1.29,-.17,dark);box(groups[3],.16,.15,.11,1.67,1.29,.17,dark);
shape(groups[7],[[-2.78,.69],[1.94,.68],[2.14,.4],[2.15,.02],[1.96,-.08],[1.49,-.15],[1.16,-.27],[.97,-.04],[.72,.19],[-.25,.3],[-1.48,.29],[-1.58,.4],[-2.77,.4]],.62);
box(groups[7],1.16,.16,.55,-2.15,.5,0);cylinder(groups[6],.065,1.22,-2.24,.39,0,silver);cylinder(groups[6],.095,.055,-2.86,.39,0,dark);
shape(groups[8],[[-.91,.27],[-1.02,.02],[-1.04,-.63],[-.77,-.87],[.42,-.89],[.87,-.62],[1.02,-.12],[.77,.24]],.42,steel,0,[[[-.73,.08],[.64,.1],[.81,-.12],[.67,-.56],[.35,-.7],[-.65,-.7],[-.86,-.52],[-.85,-.12]]]);
tube(groups[9],[[.23,.21,0],[.34,.03,0],[.28,-.23,0],[.08,-.43,0]],.062,dark);
shape(groups[11],[[1.25,.14],[1.99,.18],[2.22,-.15],[2.57,-2.08],[2.46,-2.22],[2.23,-2.19],[1.94,-.55]],.57,dark);
shape(groups[12],[[1.22,-.11],[1.94,-.13],[2.12,-.32],[2.46,-2.08],[1.57,-2.1],[1.25,-.64]],.65,dark);
for(let side of [-1,1]){shape(groups[12],[[1.37,-.25],[1.93,-.25],[2.06,-.46],[2.34,-1.97],[1.66,-1.99],[1.38,-.62]],.065,rubber,side*.36);for(let row=0;row<31;row++)for(let col=0;col<10;col++){const y=-.46-row*.044,x=1.46+col*.051+row*.008;if(x<2.04+row*.008)cylinder(groups[12],.009,.008,x,y,side*.403,steel,'z')}cylinder(groups[12],.08,.015,1.66,-.47,side*.417,dark,'z');cylinder(groups[12],.08,.015,2.05,-1.77,side*.417,dark,'z')}
shape(groups[13],[[1.63,-.9],[2.12,-.88],[2.4,-2.2],[1.86,-2.27]],.42,steel);box(groups[13],1,.1,.72,2,-2.22,0,dark);
for(let side of [-1,1]){cylinder(groups[10],.105,.07,1.12,-.34,side*.355,dark,'z');cylinder(groups[2],.085,.06,.64,.5,side*.35,dark,'z');box(groups[2],.57,.1,.09,.39,.51,side*.38,dark);shape(groups[5],[[1.45,.52],[1.94,.53],[2.02,.44],[1.96,.3],[1.47,.31]],.06,dark,side*.36);box(groups[5],.28,.04,.09,1.75,.48,side*.4,steel)}
shape(groups[4],[[1.99,.83],[2.2,1.05],[2.42,1.02],[2.41,.88],[2.18,.74]],.23,dark);for(let i=0;i<5;i++)box(groups[4],.03,.035,.25,2.22+i*.038,1.03,0,steel);
const stamp=document.createElement('canvas');stamp.width=1024;stamp.height=128;const ctx=stamp.getContext('2d');ctx.fillStyle='#777e76';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#242b24';ctx.font='52px Georgia';ctx.fillText('CZ 75 B',55,76);ctx.font='21px sans-serif';ctx.fillText('CAL. 9 LUGER',370,74);const texture=new THREE.CanvasTexture(stamp);mesh(groups[1],new THREE.PlaneGeometry(1.5,.18),new THREE.MeshStandardMaterial({map:texture,metalness:.5,roughness:.5}),-.31,.96,.361);

const descriptions=[
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
let auto=true,exploded=false,yaw=.08,pitch=.06,zoom=12,selected=-1,hovered=-1,drag=false,prev={x:0,y:0},progress=0,action=null,wear=.28;
const target=new THREE.Vector3(0,.1,0),desiredTarget=target.clone();
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(2,2);
const status=document.querySelector('#animation-status'),popup=document.querySelector('#component-popup');
document.querySelector('.panel-heading span').textContent='14 / 14';
const labelEls=info.map((d,i)=>{const el=document.createElement('button');el.className='label';el.textContent=d[0];el.style.display='none';el.onclick=()=>select(i);el.onpointerenter=()=>hovered=i;el.onpointerleave=()=>{if(!drag)hovered=-1};document.querySelector('#labels').append(el);const b=document.createElement('button');b.className='part';b.innerHTML='<em>'+String(i+1).padStart(2,'0')+'</em>'+d[0]+'<small>'+d[1]+'</small>';b.onclick=()=>select(i);document.querySelector('#parts').append(b);return el});
function setAuto(value){auto=value;const b=document.querySelector('#rotate');b.textContent=auto?'暂停旋转':'自动旋转';b.classList.toggle('active',auto)}
function select(i){selected=i;setAuto(false);zoom=6;document.querySelectorAll('.part').forEach((b,j)=>b.classList.toggle('selected',j===i));labelEls.forEach((b,j)=>b.classList.toggle('selected',j===i));document.querySelector('#component-title').textContent=info[i][0];document.querySelector('#component-english').textContent=info[i][1];document.querySelector('#component-description').textContent=descriptions[i];popup.hidden=false;document.querySelector('#detail').textContent='已聚焦：'+info[i][0]+'。拖动可从不同方向观察，关闭介绍返回全景。';}
function clearSelection(){selected=-1;popup.hidden=true;desiredTarget.set(0,.1,0);zoom=12;document.querySelectorAll('.part,.label').forEach(b=>b.classList.remove('selected'));document.querySelector('#detail').textContent='悬浮组件显示标签，点击标签或索引聚焦并查看介绍。';}
document.querySelector('#close-detail').onclick=clearSelection;
document.querySelector('#rotate').onclick=()=>setAuto(!auto);
function startAction(name){if(action)return;clearSelection();setAuto(false);if((name==='fire'||name==='reload')&&(exploded||progress>.01)){status.textContent='请先组装模型，再播放此动画。';return}action={name,start:performance.now(),duration:{fire:750,reload:2600,disassemble:2400,assemble:2400}[name],from:progress};if(name==='disassemble')exploded=true;if(name==='assemble')exploded=false;document.querySelectorAll('[data-action]').forEach(b=>{b.disabled=true;b.classList.toggle('active',b.dataset.action===name)});status.textContent={fire:'开火演示中',reload:'换弹演示中',disassemble:'拆卸演示中',assemble:'组装演示中'}[name];}
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>startAction(b.dataset.action));
document.querySelector('#reset').onclick=()=>{action=null;progress=0;exploded=false;yaw=.08;pitch=.06;hovered=-1;clearSelection();setAuto(false);document.querySelectorAll('[data-action]').forEach(b=>{b.disabled=false;b.classList.remove('active')});status.textContent='外观动画演示 · 拆装为示意位移';};
// Seeded surface maps keep scratches stable while the slider changes their visibility.
let seed=75;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const surface=document.createElement('canvas');surface.width=surface.height=512;const sc=surface.getContext('2d');sc.fillStyle='#505050';sc.fillRect(0,0,512,512);
for(let i=0;i<6500;i++){const v=50+random()*110;sc.fillStyle=`rgb(${v},${v},${v})`;sc.fillRect(random()*512,random()*512,1+random()*3,1+random()*3)}
for(let i=0;i<340;i++){const x=random()*512,y=random()*512;sc.strokeStyle=i%4===0?'#e8e8e8':'#939393';sc.lineWidth=.4+random()*1.2;sc.beginPath();sc.moveTo(x,y);sc.lineTo(x+6+random()*64,y+(random()-.5)*9);sc.stroke()}
const scratchMap=new THREE.CanvasTexture(surface);scratchMap.wrapS=scratchMap.wrapT=THREE.RepeatWrapping;scratchMap.repeat.set(2,2);
const materials=[];gun.traverse(m=>{if(m.material){const mat=m.material;materials.push({mat,color:mat.color.clone(),roughness:mat.roughness,metalness:mat.metalness});mat.bumpMap=scratchMap;mat.roughnessMap=scratchMap;mat.needsUpdate=true;}});
function updateWear(value){wear=value;materials.forEach(({mat,color,roughness,metalness})=>{mat.color.copy(color).lerp(new THREE.Color(metalness>.6?0x8b8170:0x575448),wear*.48);mat.roughness=Math.min(1,roughness+wear*.55);mat.metalness=Math.max(0,metalness-wear*.23);mat.bumpScale=wear*.055;mat.roughnessMap=wear>0?scratchMap:null;mat.needsUpdate=true});document.querySelector('#wear-value').textContent=Math.round(wear*100)+'%';}
document.querySelector('#wear').oninput=e=>updateWear(Number(e.target.value)/100);updateWear(wear);
const flash=new THREE.Group();const flashMaterial=new THREE.MeshBasicMaterial({color:0xffd78b,transparent:true,opacity:.9,depthWrite:false});const flare=new THREE.Mesh(new THREE.ConeGeometry(.26,.85,12),flashMaterial);flare.rotation.z=Math.PI/2;flash.add(flare);flash.position.set(-3.3,.94,0);flash.visible=false;gun.add(flash);const flashLight=new THREE.PointLight(0xffbd62,0,4);flashLight.position.set(-3,.94,0);gun.add(flashLight);
canvas.onpointerdown=e=>{drag=true;prev={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);setAuto(false)};
canvas.onpointerup=()=>drag=false;canvas.onpointercancel=()=>drag=false;canvas.onpointerleave=()=>{hovered=-1;pointer.set(2,2)};
canvas.onpointermove=e=>{const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);if(!drag)return;yaw+=(e.clientX-prev.x)*.008;pitch=Math.max(-1.15,Math.min(1.15,pitch+(e.clientY-prev.y)*.006));prev={x:e.clientX,y:e.clientY}};
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(4,Math.min(19,zoom+e.deltaY*.008))},{passive:false});
const smooth=t=>t*t*(3-2*t);
let last=performance.now();function frame(now){requestAnimationFrame(frame);let dt=Math.min((now-last)/1000,.05);last=now;if(auto&&!drag)yaw+=dt*.18;
let recoil=0,magazine=0,trigger=0;
if(action){const t=Math.min(1,(now-action.start)/action.duration);if(action.name==='disassemble'||action.name==='assemble'){const end=action.name==='disassemble'?1:0;progress=action.from+(end-action.from)*smooth(t)}if(action.name==='fire'){recoil=Math.sin(Math.min(1,t/.65)*Math.PI)*.42;trigger=Math.sin(t*Math.PI)*.08;flash.visible=t<.17;flash.scale.setScalar(.8+Math.sin(t*70)*.2);flashLight.intensity=t<.17?5:0;}if(action.name==='reload'){magazine=t<.42?smooth(t/.42):t<.58?1:1-smooth((t-.58)/.42)}if(t===1){action=null;flash.visible=false;flashLight.intensity=0;document.querySelectorAll('[data-action]').forEach(b=>{b.disabled=false;b.classList.remove('active')});status.textContent=exploded?'拆卸完成 · 可悬浮查看独立组件':'动画完成 · 模型已回位';}}
gun.rotation.set(pitch,yaw,0);gun.position.x=-.2+recoil*.16;
const w=view.clientWidth,h=view.clientHeight;if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
groups.forEach((g,i)=>{g.position.fromArray(info[i][3]).multiplyScalar(progress);if([0,1,3].includes(i))g.position.x+=recoil;if(i===13){g.position.y-=magazine*2.6;g.position.x-=magazine*.4}if(i===9)g.position.x+=trigger;if(i===4)g.position.y-=trigger;g.children.forEach(m=>{if(m.material&&m.material.emissive)m.material.emissive.setHex(selected===i?0x293513:hovered===i?0x15200b:0)})});gun.updateMatrixWorld(true);
if(selected>=0){desiredTarget.fromArray(info[selected][2]).add(groups[selected].position);gun.localToWorld(desiredTarget)}target.lerp(desiredTarget,1-Math.exp(-dt*5));camera.position.lerp(new THREE.Vector3(target.x,target.y+.3,target.z+zoom),1-Math.exp(-dt*5));camera.lookAt(target);camera.updateMatrixWorld();
if(!drag){const labelHover=labelEls.findIndex(el=>el.matches(':hover'));if(labelHover>=0){hovered=labelHover}else{raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(groups,true)[0];if(hit){let obj=hit.object;while(obj.parent&&obj.userData.index===undefined)obj=obj.parent;hovered=obj.userData.index??-1}else hovered=-1;}}
labelEls.forEach((el,i)=>{const v=new THREE.Vector3(...info[i][2]).add(groups[i].position);gun.localToWorld(v);v.project(camera);el.style.left=(v.x*.5+.5)*w+'px';el.style.top=(-v.y*.5+.5)*h-18+'px';el.style.display=!drag&&hovered===i&&v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1?'block':'none';});renderer.render(scene,camera)}requestAnimationFrame(frame);
window.modelStudy={componentCount:groups.length,scene,renderer,camera,groups,select,startAction,updateWear,get state(){return {selected,hovered,progress,wear,action:action?.name}}};
}catch(e){document.querySelector('#error').hidden=false;console.error(e)}
