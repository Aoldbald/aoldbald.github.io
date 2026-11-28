// 雪山：三座石头山戴雪帽 + 一排小松树
export const color = '#8fb8de';

export function build(g, k, rnd) {
  const { C, TOP, cone, tree } = k;
  [[-1.2,-1.6,3.1,5.6],[1.9,-2.2,2.4,4.2],[-3.4,0.6,1.9,3.2]].forEach(([x,z,r,h])=>{
    g.add(cone(r,h,5,C.stone,x,TOP+h/2,z));
    g.add(cone(r*0.4,h*0.4,5,C.snow,x,TOP+h*0.8+0.01,z));
  });
  for (let i=0;i<5;i++) tree(g,-4+i*0.85,2.3+(i%2)*0.9,0.7,1,rnd);
}
