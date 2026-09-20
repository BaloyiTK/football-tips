export const MODEL_VERSION = '1.0';

export const MATCH_TEAM_FORM = Object.freeze({
  resultValues: Object.freeze({ W: 1, D: 1 / 3, L: 0 }),
  recencyWeights: Object.freeze([0.30, 0.25, 0.20, 0.15, 0.10]),
  overallWeight: 0.40,
  venueWeight: 0.60,
});

export function parseProbability(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const parsed = Number(trimmed.replace('%', ''));
    if (!Number.isFinite(parsed)) return null;
    const normalised = trimmed.endsWith('%') || parsed > 1 ? parsed / 100 : parsed;
    return normalised >= 0 && normalised <= 1 ? normalised : null;
  }
  if (!Number.isFinite(value)) return null;
  if (value > 1 && value <= 100) return value / 100;
  return value >= 0 && value <= 1 ? value : null;
}

export function parseHeat(value) {
  if (Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.split('/')[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normaliseResult(result) {
  const value = String(result || '').trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(MATCH_TEAM_FORM.resultValues, value) ? value : null;
}

export function calculateWeightedFive(results) {
  if (!Array.isArray(results) || results.length !== 5) return null;
  const normalised = results.map(normaliseResult);
  if (normalised.some((result) => result === null)) return null;

  const score = normalised.reduce((total, result, index) => {
    return total + MATCH_TEAM_FORM.resultValues[result] * MATCH_TEAM_FORM.recencyWeights[index];
  }, 0);

  return Math.round(score * 1000) / 10;
}

export function calculateWeightedMetric(values) {
  if (!Array.isArray(values) || values.length !== 5) return null;
  const parsed = values.map(Number);
  if (parsed.some((value) => !Number.isFinite(value))) return null;

  const weighted = parsed.reduce(
    (total, value, index) => total + value * MATCH_TEAM_FORM.recencyWeights[index],
    0
  );
  return Math.round(weighted * 100) / 100;
}

export function calculateRecentTrend(results) {
  if (!Array.isArray(results) || results.length !== 5) return null;
  const normalised = results.map(normaliseResult);
  if (normalised.some((result) => result === null)) return null;

  const values = normalised.map((result) => MATCH_TEAM_FORM.resultValues[result] * 100);
  const recentTwo = (values[0] + values[1]) / 2;
  const olderThree = (values[2] + values[3] + values[4]) / 3;
  return Math.round((recentTwo - olderThree) * 10) / 10;
}

export function calculateMatchTeamForm({
  overallResults,
  venueResults,
  goalsScored,
  goalsConceded,
  xG,
  xGA,
  opponentStrength,
} = {}) {
  const overall = calculateWeightedFive(overallResults);
  const venue = calculateWeightedFive(venueResults);
  if (overall === null || venue === null) return null;

  const score =
    overall * MATCH_TEAM_FORM.overallWeight +
    venue * MATCH_TEAM_FORM.venueWeight;

  return {
    overall,
    venue,
    score: Math.round(score * 10) / 10,
    goalsScored: calculateWeightedMetric(goalsScored),
    goalsConceded: calculateWeightedMetric(goalsConceded),
    xG: calculateWeightedMetric(xG),
    xGA: calculateWeightedMetric(xGA),
    opponentStrength: calculateWeightedMetric(opponentStrength),
    recentTrend: calculateRecentTrend(overallResults),
    overallWeight: MATCH_TEAM_FORM.overallWeight,
    venueWeight: MATCH_TEAM_FORM.venueWeight,
    recencyWeights: [...MATCH_TEAM_FORM.recencyWeights],
  };
}

export function calculateH2H(results) {
  if (!Array.isArray(results) || results.length !== 5) return null;
  const score = calculateWeightedFive(results);
  if (score === null) return null;
  const normalised = results.map(normaliseResult);
  return {
    score,
    wins: normalised.filter((result) => result === 'W').length,
    draws: normalised.filter((result) => result === 'D').length,
    losses: normalised.filter((result) => result === 'L').length,
    results: normalised,
    recencyWeights: [...MATCH_TEAM_FORM.recencyWeights],
  };
}

export function calculateMatchTeamFormGap(homeForm, awayForm) {
  if (!homeForm || !awayForm) return null;
  return Math.round((homeForm.score - awayForm.score) * 10) / 10;
}

function evidenceScore(pick) {
  const evidence = pick?.footballEvidence || {};
  const values = Object.values(evidence).filter((v) => typeof v === 'string');
  const support = values.filter((v) => ['pass','support','positive'].includes(v)).length;
  const oppose = values.filter((v) => ['fail','oppose','negative'].includes(v)).length;
  return support - oppose;
}

export function evaluatePick(pick) {
  const probability = parseProbability(pick?.probability);
  const heat = parseHeat(pick?.heat);
  const odds = Number(pick?.odds);
  const eScore = evidenceScore(pick);
  const matchTeamForm = calculateMatchTeamForm(pick?.matchTeamForm);
  const h2h = calculateH2H(pick?.h2hResults);

  let expectedValue = null;
  if (probability !== null && Number.isFinite(odds) && odds > 1) {
    expectedValue = probability * odds - 1;
  }

  const probabilityPoints = probability === null ? 0 : probability * 70;
  const heatPoints = heat === null ? 0 : Math.min(Math.max(heat, 0), 8) / 8 * 15;
  const evidencePoints = Math.max(-15, Math.min(15, eScore * 3));
  const valuePoints = expectedValue === null ? 0 : Math.max(-15, Math.min(15, expectedValue * 100));
  const fallbackScore = Math.max(0, Math.min(100, probabilityPoints + heatPoints + evidencePoints + valuePoints));

  return {
    grade: 'ranked',
    qualifies: true,
    score: matchTeamForm?.score ?? Math.round(fallbackScore * 10) / 10,
    matchTeamForm,
    h2h,
    probability,
    heat,
    expectedValue,
    reasons: [],
  };
}

export function selectCorePicks(picks) {
  const ranked = (Array.isArray(picks) ? picks : [])
    .map((pick) => ({ ...pick, assessment: evaluatePick(pick) }))
    .sort((a, b) => b.assessment.score - a.assessment.score);

  return {
    core: ranked,
    watchlist: [],
    skip: [],
    rejected: [],
    belowCut: [],
    evaluatedCount: ranked.length,
  };
}

export function formatPercent(value, digits = 1) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : '—';
}


export const ENGINE = Object.freeze({
  xgWeight: 0.60,
  goalsWeight: 0.40,
  contextCap: 0.15,
  lambdaMin: 0.05,
  lambdaMax: 5.00,
});

const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
const mean = (xs) => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : null;

export function calculateH2HWithAge(results, agesDays = []) {
  if (!Array.isArray(results) || results.length !== 5) return null;
  const normalised = results.map(normaliseResult);
  if (normalised.some((r)=>r===null)) return null;
  const ages = agesDays.length === 5 ? agesDays : [0,0,0,0,0];
  let weightSum=0, scoreSum=0;
  normalised.forEach((r,i)=>{
    const ageFactor = Math.exp(-Math.max(0,Number(ages[i])||0)/1095);
    const w = MATCH_TEAM_FORM.recencyWeights[i] * ageFactor;
    weightSum += w;
    scoreSum += MATCH_TEAM_FORM.resultValues[r] * w;
  });
  return {score: weightSum ? Math.round(scoreSum/weightSum*1000)/10 : null, ageAdjusted:true};
}

export function calculateReliability({goals=[], xg=[]}={}) {
  const g=goals.map(Number).filter(Number.isFinite);
  if (!g.length) return null;
  const rate=(n)=>g.filter(v=>v>=n).length/g.length;
  const avg=mean(g);
  const variance=mean(g.map(v=>(v-avg)**2)) || 0;
  const consistency=1/(1+Math.sqrt(variance));
  const x= xg.map(Number).filter(Number.isFinite);
  const finishing = x.length===g.length && mean(x)>0 ? clamp(avg/mean(x),0.65,1.35) : 1;
  return {score1:rate(1),score2:rate(2),score3:rate(3),failedToScore:1-rate(1),consistency,finishing};
}

export function calculateDefensiveReliability({conceded=[]}={}) {
  const g=conceded.map(Number).filter(Number.isFinite);
  if (!g.length) return null;
  const rate=(n)=>g.filter(v=>v>=n).length/g.length;
  return {cleanSheet:g.filter(v=>v===0).length/g.length,concede1:rate(1),concede2:rate(2),concede3:rate(3)};
}

function production(goals,xg){
  const g=Number(goals), x=Number(xg);
  if(Number.isFinite(g)&&Number.isFinite(x)) return ENGINE.goalsWeight*g+ENGINE.xgWeight*x;
  if(Number.isFinite(x)) return x;
  return Number.isFinite(g)?g:null;
}

export function calculateAttackDefence({homeGF,homeXG,homeGA,homeXGA,awayGF,awayXG,awayGA,awayXGA,leagueHomeGoals=1.5,leagueAwayGoals=1.2}={}) {
  const ha=production(homeGF,homeXG), hd=production(homeGA,homeXGA);
  const aa=production(awayGF,awayXG), ad=production(awayGA,awayXGA);
  if([ha,hd,aa,ad].some(v=>v===null)) return null;
  return {
    homeBase: Math.sqrt(Math.max(.01,ha)*Math.max(.01,ad)),
    awayBase: Math.sqrt(Math.max(.01,aa)*Math.max(.01,hd)),
    leagueHomeGoals,leagueAwayGoals
  };
}

export function calculateExpectedGoals(input={}) {
  const matchup=calculateAttackDefence(input);
  if(!matchup) return null;
  const adjust=(base,key)=>{
    const reliability=clamp(Number(input[key+'ReliabilityAdjustment'])||0,-.08,.08);
    const setPieces=clamp(Number(input[key+'SetPieceAdjustment'])||0,-.05,.05);
    const squad=clamp(Number(input[key+'SquadAdjustment'])||0,-.10,.10);
    const motivation=clamp(Number(input[key+'MotivationAdjustment'])||0,-.07,.07);
    const total=clamp(reliability+setPieces+squad+motivation,-ENGINE.contextCap,ENGINE.contextCap);
    return {lambda:clamp(base*(1+total),ENGINE.lambdaMin,ENGINE.lambdaMax),adjustment:total};
  };
  const h=adjust(matchup.homeBase,'home'), a=adjust(matchup.awayBase,'away');
  return {home:Math.round(h.lambda*100)/100,away:Math.round(a.lambda*100)/100,homeAdjustment:h.adjustment,awayAdjustment:a.adjustment};
}

function factorial(n){let r=1;for(let i=2;i<=n;i++)r*=i;return r;}
function pois(k,l){return Math.exp(-l)*l**k/factorial(k);}

export function calculatePoisson(lambdaHome,lambdaAway,maxGoals=10){
  const lh=Number(lambdaHome),la=Number(lambdaAway);
  if(!Number.isFinite(lh)||!Number.isFinite(la)||lh<0||la<0)return null;
  let home=0,draw=0,away=0,btts=0,over15=0,over25=0,under45=0;
  const scores=[];
  for(let h=0;h<=maxGoals;h++)for(let a=0;a<=maxGoals;a++){
    const p=pois(h,lh)*pois(a,la); scores.push({home:h,away:a,p});
    if(h>a)home+=p; else if(h===a)draw+=p; else away+=p;
    if(h>0&&a>0)btts+=p; if(h+a>=2)over15+=p; if(h+a>=3)over25+=p; if(h+a<=4)under45+=p;
  }
  scores.sort((x,y)=>y.p-x.p);
  const floor=(l,n)=>1-[...Array(n).keys()].reduce((s,k)=>s+pois(k,l),0);
  return {home,draw,away,homeOrDraw:home+draw,awayOrDraw:away+draw,btts,over15,over25,under45,
    home1:floor(lh,1),home2:floor(lh,2),home3:floor(lh,3),away1:floor(la,1),away2:floor(la,2),away3:floor(la,3),
    topScores:scores.slice(0,5)};
}

export function calculateMarketValue({probability,odds,marketProbabilities}={}){
  const p=parseProbability(probability),o=Number(odds);
  if(p===null||!Number.isFinite(o)||o<=1)return null;
  let noVig=null;
  if(Array.isArray(marketProbabilities)&&marketProbabilities.length){
    const ps=marketProbabilities.map(parseProbability);
    const sum=ps.every(v=>v!==null)?ps.reduce((a,b)=>a+b,0):0;
    if(sum>0) noVig=ps[0]/sum;
  }
  return {fairOdds:1/p,impliedProbability:1/o,noVigProbability:noVig,edge:noVig===null?null:p-noVig,expectedValue:p*o-1};
}
