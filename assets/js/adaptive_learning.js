/* Local adaptive learning helper for STAT 102. Offline only. */
(function(){
  if(window.AdaptiveLearning) return;
  const KEY='stat102_local_training_events_v1';
  const mastery={};
  let models={bkt:null,lr:null};
  function loadEvents(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')||[]}catch(e){return []}}
  function saveEvents(events){try{localStorage.setItem(KEY,JSON.stringify(events.slice(-1000)))}catch(e){}}
  window.AdaptiveLearning={
    updateBKT:function(skillId,isCorrect){
      const id=String(skillId||'general');
      const prior=(mastery[id]==null?0.35:mastery[id]);
      const learn=(models.bkt&&models.bkt.learn_rate)||0.12;
      const slip=(models.bkt&&models.bkt.slip)||0.10;
      const guess=(models.bkt&&models.bkt.guess)||0.20;
      let post=isCorrect ? (prior*(1-slip))/(prior*(1-slip)+(1-prior)*guess) : (prior*slip)/(prior*slip+(1-prior)*(1-guess));
      post=post+(1-post)*learn;
      mastery[id]=Math.max(0.01,Math.min(0.99,post));
      return {skill_id:id,mastery:mastery[id]};
    },
    predictMastery:function(payload){
      const m=Number(payload&&payload.bkt_mastery!=null?payload.bkt_mastery:0.35);
      const attempts=Number(payload&&payload.attempts_count||1);
      const used=payload&&payload.used_help?0.08:0;
      const showed=payload&&payload.showed_solution?0.12:0;
      const difficulty=String(payload&&payload.difficulty||'medium');
      const diffPenalty=difficulty.indexOf('صعب')>=0||difficulty==='hard'?0.10:(difficulty.indexOf('سهل')>=0||difficulty==='easy'?-0.04:0);
      const p=Math.max(0.01,Math.min(0.99,m - used - showed - diffPenalty - Math.max(0,attempts-1)*0.04));
      return {probability_mastered:p,recommended_support:p>=0.75?'none':(p>=0.50?'hint':'guided_steps')};
    },
    collectStudentEvent:function(payload){const events=loadEvents(); events.push(Object.assign({timestamp:new Date().toISOString()},payload||{})); saveEvents(events); return {ok:true,count:events.length};},
    exportTrainingData:function(){const events=loadEvents(); const blob=new Blob([JSON.stringify({course:'STAT102',events:events},null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='stat102_training_events.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),500); return {ok:true,count:events.length};},
    loadModelWeights:function(paths){
      paths=paths||{};
      return Promise.all(['bktPath','lrPath'].map(function(k){if(!paths[k]) return null; return fetch(paths[k]).then(r=>r.ok?r.json():null).catch(()=>null)})).then(function(res){
        models.bkt=res[0]||models.bkt;
        models.lr=res[1]||models.lr;
        const loaded=!!(res[0]||res[1]||models.bkt||models.lr);
        if(!loaded) return Promise.reject(new Error('model files not loaded'));
        return {ok:true,models:models,loaded:loaded};
      });
    }
  };
})();
