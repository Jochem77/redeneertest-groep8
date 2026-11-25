/* Vragen, antwoorden en figuren — gedeeld door index.html en resultaten.html */
/* ---------- figure helpers ---------- */
const seq = (arr) => '<div class="seq">' + arr.map(v => v === '?' ? '<span class="qm">?</span>' : v === '|' ? '<span class="sp"></span>' : v === '→' ? '<span class="ar">→</span>' : `<span>${v}</span>`).join('') + '</div>';
const arrowSvg = (deg) => `<svg viewBox="0 0 40 40" aria-hidden="true"><g transform="rotate(${deg} 20 20)" stroke="var(--fig)" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="33" x2="20" y2="8"/><polyline points="11,16 20,7 29,16"/></g></svg>`;
const arrows = (list) => '<div class="arrows">' + list.map(arrowSvg).join('') + '<div class="qbox">?</div></div>';
const shape = (type, filled, rot = 0) => {
  const f = filled ? 'var(--fig)' : 'none';
  let el = type === 'sq' ? `<rect x="8" y="8" width="24" height="24" />`
         : type === 'ci' ? `<circle cx="20" cy="20" r="13" />`
         : `<polygon points="20,6 34,31 6,31" />`;
  return `<svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><g transform="rotate(${rot} 20 20)" fill="${f}" stroke="var(--fig)" stroke-width="2.4" stroke-linejoin="round">${el}</g></svg>`;
};
const rules = (rows) => '<div class="rules">' + rows.map(r => `<div class="rule">${r.join('')}</div>`).join('') + '</div>';
const TO = '<span class="to">→</span>', QB = '<div class="qbox">?</div>', PLUS = '<span class="plus">+</span>';
const strip = (s) => '<div class="strip">' + [...s].map(ch => `<i class="${ch === '#' ? 'on' : ''}"></i>`).join('') + '</div>';
/* grid: rows = array of arrays. tokens: '' white, '#' black, '.' dot, 'x' cross, '_' none, '*X' highlighted label, other = label */
function grid(rows, o = {}) {
  const s = o.s || 36, gap = 2, pad = 4;
  const cols = Math.max(...rows.map(r => r.length));
  let h = `<div class="grid" style="--s:${s}px;grid-template-columns:repeat(${cols},${s}px)">`;
  rows.forEach(r => r.forEach(t => {
    let cls = 'c', txt = '';
    if (t === '#') cls += ' on';
    else if (t === '.') cls += ' dot';
    else if (t === 'x') cls += ' cross';
    else if (t === '_') cls += ' blank';
    else if (t === 'S') { cls += ' start'; txt = 'S'; }
    else if (t) { cls += o.plain ? '' : ' lab'; txt = t; }
    h += `<div class="${cls}">${txt}</div>`;
  }));
  if (o.v != null) h += `<div class="mline v" style="left:${pad + o.v * (s + gap) - gap / 2 - 1.5}px"></div>`;
  if (o.h != null) h += `<div class="mline h" style="top:${pad + o.h * (s + gap) - gap / 2 - 1.5}px"></div>`;
  return h + '</div>';
}
const rotFig = (a, b) => `${a}<span class="rot-arrow">→</span>${b}`;

/* ---------- data ---------- */
const PARTS = ['Woordverbanden', 'Getalpatronen', 'Logisch denken', 'Figuren en ruimte'];
const L = 'Wat hoort op de lege plek?';
const NB = 'Welk ding past er <b>niet bij</b>?';
const TEG = 'Welke twee woorden betekenen <b>het tegenovergestelde</b> van elkaar?';
const VR = 'Welk getal komt op de plek van het vraagteken?';
const PIJL = 'Bij elke pijl geldt <b>dezelfde regel</b>. Welk getal komt op de plek van het vraagteken?';
const ZEKER = 'Wat weet je zeker?';
const RIJ = 'In <b>elke rij</b> gebeurt hetzelfde. Wat komt op de plek van het <b>vraagteken</b>?';
const SPIEGEL = '<b>Spiegel</b> de zwarte vakjes in de <b>stippellijn</b>. Op welke vakjes komen de zwarte vakjes terecht?';
const DOB = 'Stel je voor dat je het bouwplaatje opvouwt tot een dobbelsteen.';

const OPG = [
/* DEEL 1 */
{p:0, qs:[
 {q:`Een <b>paard</b> hoort bij een <b>stal</b>. Een <b>hond</b> hoort bij …`, sub:L, o:['een hok','een riem','een bot','een voerbak'], a:0, w:'Een hok is een verblijf voor een hond, zoals een stal voor een paard.'},
 {q:`Een <b>vogel</b> hoort bij een <b>nest</b>. Een <b>bij</b> hoort bij …`, sub:L, o:['bloem','honing','korf','vleugel'], a:2, w:'Een nest is een verblijfplaats van vogels. Een korf is een verblijfplaats van bijen.'},
 {q:`Een <b>beer</b> hoort bij een <b>hol</b>. Een <b>monnik</b> (iemand die leeft voor zijn geloof) hoort bij …`, sub:L, o:['een klooster','een mantel','een klok','een kerk'], a:0, w:'Een hol is de verblijfplaats van een beer. Een monnik woont in een klooster.'},
 {q:`Een <b>bever</b> hoort bij een <b>beverburcht</b>. Een <b>mier</b> hoort bij …`, sub:L, o:['mierenkolonie','mierenpad','mierenhoop','mierenlarve'], a:2, w:'Een beverburcht is een verblijfplaats van bevers. Een mierenhoop is een verblijfplaats van mieren.'},
]},
{p:0, qs:[
 {q:NB, o:['potlood','gum','pen','viltstift'], a:1, w:'Met een potlood, pen en viltstift schrijf je. Met een gum wis je sporen van een potlood.'},
 {q:NB, o:['liniaal','schaar','meetlint','weegschaal'], a:1, w:'Met drie voorwerpen meet je iets. Met een schaar knip je.'},
 {q:NB, o:['kompas','plattegrond','wegwijzer','stopwatch'], a:3, w:'De eerste drie helpen je de weg of richting te bepalen. Een stopwatch meet tijd.'},
 {q:NB, o:['rookmelder','deurbel','wekker','microfoon'], a:3, w:'Een rookmelder, deurbel en wekker maken zelf een geluid om je te waarschuwen. Een microfoon vangt geluid op.'},
]},
{p:0, qs:[
 {q:`Een <b>wiel</b> hoort bij een <b>fiets</b>. Een <b>deur</b> hoort bij …`, sub:L, o:['huis','raam','sleutel','bel'], a:0, w:'Een wiel is deel van een fiets. Een deur is deel van een huis.'},
 {q:`Een <b>hoofdstuk</b> hoort bij een <b>boek</b>. Een <b>scène</b> hoort bij …`, sub:L, o:['toneelstuk','acteur','gordijn','publiek'], a:0, w:'Een hoofdstuk is een deel van een boek. Een scène is een deel van een toneelstuk.'},
 {q:`Een <b>bladzijde</b> hoort bij een <b>tijdschrift</b>. Een <b>strofe</b> (een groep regels) hoort bij …`, sub:L, o:['rijm','dichter','letter','gedicht'], a:3, w:'Een bladzijde is een deel van een tijdschrift. Een strofe is een groep regels in een gedicht.'},
 {q:`Een <b>winkelcentrum</b> hoort bij een <b>winkel</b>. Een <b>winkel</b> hoort bij …`, sub:L, o:['klant','korting','afdeling','bedrijventerrein'], a:2, w:'Een winkel is een deel van een winkelcentrum. Een afdeling is een deel van een winkel.'},
]},
{p:0, wide:true, qs:[
 {q:TEG, o:['hoog en groot','laag en klein','hoog en laag','groot en breed'], a:2, w:'Hoog en laag hebben een tegengestelde betekenis.'},
 {q:TEG, o:['toestaan en verbieden','aarzelen en twijfelen','verzamelen en bewaren','fluisteren en praten'], a:0, w:'Toestaan betekent dat iets mag. Verbieden betekent dat iets niet mag.'},
 {q:TEG, o:['beperken en verkleinen','verzwakken en versterken','uitstellen en verplaatsen','weigeren en afwijzen'], a:1, w:'Iets verzwakken maakt het minder sterk. Iets versterken maakt het sterker.'},
 {q:TEG, o:['bevestigen en ontkennen','uitstellen en afzeggen','herstellen en verbeteren','uitbreiden en verdelen'], a:0, w:'Bevestigen is zeggen dat iets klopt. Ontkennen is zeggen dat iets niet klopt.'},
]},
{p:0, qs:[
 {q:`Een <b>kapotte lamp</b> geeft <b>geen licht</b>. Een <b>kapotte luidspreker</b> geeft …`, sub:L, o:['geen geluid','geen stroom','geen licht','geen water'], a:0, w:'Een lamp geeft normaal licht. Een luidspreker geeft normaal geluid.'},
 {q:`<b>Doof</b> hoort bij <b>horen</b>. <b>Blind</b> hoort bij …`, sub:L, o:['voelen','zien','lezen','donker'], a:1, w:'Wie doof is, kan niet horen. Wie blind is, kan niet zien.'},
 {q:`<b>Onleesbaar</b> hoort bij <b>lezen</b>. <b>Onhoorbaar</b> hoort bij …`, sub:L, o:['spreken','zingen','horen','geluid'], a:2, w:'Iets onleesbaars kun je niet lezen. Iets onhoorbaars kun je niet horen.'},
 {q:`<b>Onverstaanbaar</b> hoort bij <b>verstaan</b>. <b>Buiten handbereik</b> hoort bij …`, sub:L, o:['aanwijzen','zien','beschrijven','pakken'], a:3, w:'Iets onverstaanbaars kun je niet verstaan. Iets buiten handbereik kun je niet pakken.'},
]},
{p:0, wide:true, qs:[
 {q:`<b>Alle merels</b> zijn <b>vogels</b>. ${ZEKER}`, o:['Alle vogels zijn merels.','Geen merel is een vogel.','Een merel is een vogel.','Een vogel kan geen merel zijn.'], a:2, w:'Elke merel valt in de groep vogels.'},
 {q:`Door <b>ijzel</b> wordt de weg <b>glad</b>. Een gladde weg is <b>gevaarlijk</b>. ${ZEKER}`, o:['Elke gladde weg is glad door ijzel.','IJzel maakt de weg gevaarlijk.','Elke gevaarlijke weg heeft ijzel.','Een weg zonder ijzel is altijd veilig.'], a:1, w:'IJzel maakt een weg eerst glad. Een gladde weg is gevaarlijk.'},
 {q:`De <b>eenden en zwanen</b> in deze vijver zijn vogels. <b>Alle vogels</b> in deze vijver hebben <b>een ring</b> om hun poot. ${ZEKER}`, o:['Alle dieren in deze vijver hebben een ring.','De eenden en zwanen in deze vijver hebben een ring.','Alle vogels met een ring zijn eenden of zwanen.','Alle eenden in Nederland hebben een ring.'], a:1, w:'De regel geldt voor alle vogels in deze vijver, dus ook voor de eenden en zwanen.'},
 {q:`<b>Alle stripboeken</b> liggen in de kast. <b>Alle boeken in de kast</b> zitten <b>in een doos</b>. Er zitten ook <b>schoolboeken</b> in dozen. ${ZEKER}`, o:['Alle stripboeken zitten in een doos.','Alle boeken in dozen liggen in de kast.','Sommige stripboeken zijn schoolboeken.','Alle schoolboeken liggen in de kast.'], a:0, w:'De stripboeken liggen in de kast. De regel over dozen geldt voor elk boek in de kast.'},
]},
/* DEEL 2 */
{p:1, qs:[
 {q:VR, f:seq([4,8,12,16,'?']), o:['20','18','21','24'], a:0, w:'Tel er steeds 4 bij op.'},
 {q:VR, f:seq([3,5,9,15,'?']), o:['23','21','22','25'], a:0, w:'De sprongen zijn +2, +4 en +6. De volgende sprong is +8.'},
 {q:VR, f:seq([4,7,13,22,34,'?']), o:['49','46','47','52'], a:0, w:'De sprongen zijn +3, +6, +9, +12, dus de volgende is +15.'},
 {q:VR, f:seq([1,3,7,14,25,'?']), o:['40','42','41','44'], a:2, w:'De sprongen +2, +4, +7 en +11 groeien met 2, 3 en 4. De volgende is +16.'},
]},
{p:1, qs:[
 {q:VR, f:seq([2,7,2,7,2,'?']), o:['2','4','5','7'], a:3, w:'De serie herhaalt steeds 2 en 7.'},
 {q:VR, f:seq([3,10,5,12,7,14,'?']), o:['11','16','9','21'], a:2, w:'Wissel +7 en −5 af. Na 14 volgt 14 − 5 = 9.'},
 {q:VR, f:seq([4,12,10,30,28,84,'?']), o:['86','82','168','252'], a:1, w:'Wissel ×3 en −2 af. Nu volgt 84 − 2 = 82.'},
 {q:VR, f:seq([8,23,11,28,14,33,17,'?']), o:['34','35','36','38'], a:3, w:'De oneven plaatsen zijn 8, 11, 14, 17. De even plaatsen zijn 23, 28, 33, 38.'},
]},
{p:1, qs:[
 {q:PIJL, f:seq([2,'→',4,'|',3,'→',6,'|',5,'→',10,'|',7,'→','?']), o:['9','12','14','21'], a:2, w:'Verdubbel elk getal.'},
 {q:PIJL, f:seq([2,'→',7,'|',5,'→',16,'|',8,'→',25,'|',11,'→','?']), o:['34','28','30','33'], a:0, w:'Vermenigvuldig met 3 en tel er 1 bij. 11 × 3 + 1 = 34.'},
 {q:PIJL, f:seq([2,'→',6,'|',3,'→',12,'|',5,'→',30,'|',9,'→','?']), o:['72','81','99','90'], a:3, w:'Vermenigvuldig elk getal met het volgende getal. 9 × 10 = 90.'},
 {q:PIJL, f:seq([2,'→',5,'|',3,'→',10,'|',4,'→',17,'|',5,'→',26,'|','?','→',50]), o:['5','6','7','8'], a:2, w:'De regel is: vermenigvuldig het getal met zichzelf en tel er 1 bij. Terugwerken: 50 − 1 = 49 en 7 × 7 = 49.'},
]},
{p:1, qs:[
 {q:'De code heeft 2 cijfers. Het <b>eerste cijfer is 4</b>. Tel je de cijfers op, <b>dan krijg je 9</b>. Wat is de code?', o:['44','49','45','54'], a:2, w:'Bij 4 moet nog 5 om samen 9 te krijgen.'},
 {q:'De code heeft 2 cijfers. <b>Samen zijn ze 11</b>. Het eerste cijfer is <b>3 groter</b> dan het tweede. Wat is de code?', o:['47','83','65','74'], a:3, w:'7 + 4 = 11 en 7 − 4 = 3.'},
 {q:'De code heeft 3 cijfers. Het eerste cijfer is <b>2 keer zo groot</b> als het laatste. Het middelste cijfer is <b>1 kleiner</b> dan het eerste. <b>Samen zijn ze 14</b>. Wat is de code?', o:['563','635','653','743'], a:2, w:'Bij een laatste cijfer 3 passen 6 en 5. 6 + 5 + 3 = 14.'},
 {q:'De code heeft <b>3 verschillende cijfers</b>. <b>Samen zijn ze 18</b>. Het eerste cijfer is <b>2 groter</b> dan het laatste. Het middelste cijfer is <b>2 keer zo groot</b> als het laatste. Wat is de code?', o:['765','684','846','927'], a:1, w:'Neem het laatste cijfer vier keer en tel er 2 bij: dat is 18. Dus het laatste cijfer is 4, en de eerste twee zijn 6 en 8.'},
]},
{p:1, qs:[
 {q:VR, f:seq([20,10,5,'?']), o:['2','2,5','3','4'], a:1, w:'Halveer steeds het vorige getal.'},
 {q:VR, f:seq([24,12,16,8,12,'?']), o:['4','5','6','8'], a:2, w:'Wissel halveren en +4 af. 12 ÷ 2 = 6.'},
 {q:VR, f:seq([64,32,35,'17,5','20,5','?']), o:['12,5','10,25','14,5','23,5'], a:1, w:'Wissel delen door 2 en +3 af. 20,5 ÷ 2 = 10,25.'},
 {q:VR, f:seq([96,48,52,26,34,17,29,'?']), o:['16,5','19','35','14,5'], a:3, w:'Halveer om de beurt. De stappen ertussen zijn +4, +8, +12. Nu halveer je 29.'},
]},
{p:1, qs:[
 {q:'<b>2 vierkanten</b> wegen samen evenveel als <b>4 driehoeken</b>. Hoeveel driehoeken wegen evenveel als één vierkant?', o:['3','5','2','6'], a:2, w:'Verdeel de 4 driehoeken over de 2 vierkanten: 2 driehoeken per vierkant.'},
 {q:'<b>2 vierkanten</b> wegen samen evenveel als <b>1 cirkel en 1 driehoek</b>. 1 cirkel weegt evenveel als <b>3 driehoeken</b>. Hoeveel driehoeken wegen evenveel als één vierkant?', o:['1','2','3','4'], a:1, w:'Twee vierkanten wegen samen evenveel als 4 driehoeken. Deel beide aantallen door 2.'},
 {q:'<b>1 cirkel</b> weegt evenveel als <b>3 driehoeken</b>. <b>2 vierkanten</b> wegen samen evenveel als <b>2 cirkels en 4 driehoeken</b>. Hoeveel driehoeken wegen evenveel als één vierkant?', o:['5','3','4','6'], a:0, w:'Twee vierkanten wegen evenveel als 2 × 3 + 4 = 10 driehoeken. Eén vierkant weegt dus 5.'},
 {q:'<b>2 vierkanten</b> wegen samen evenveel als <b>3 cirkels</b>. <b>1 cirkel en 1 vierkant</b> wegen samen evenveel als <b>10 driehoeken</b>. Hoeveel driehoeken wegen evenveel als één vierkant?', o:['6','4','5','8'], a:0, w:'Twee cirkels en twee vierkanten wegen 20 driehoeken. Ruil de twee vierkanten om voor drie cirkels: 5 cirkels = 20 driehoeken. Een cirkel weegt 4, dus een vierkant 6.'},
]},
/* DEEL 3 */
{p:2, wide:true, qs:[
 {q:`Iedereen uit het <b>schoolkoor</b> draagt <b>een groene sticker</b>. <b>Liv zit bij het koor</b>. ${ZEKER}`, o:['Liv draagt een blauwe sticker.','Liv draagt een groene sticker.','Alleen Liv heeft een groene sticker.','Iedereen met een groene sticker zit bij het koor.'], a:1, w:'Iedereen in het schoolkoor draagt een groene sticker. Liv zit bij het koor.'},
 {q:`Iedereen in het <b>schoolteam</b> draagt een <b>blauwe pet</b>. Ravi draagt een <b>blauwe pet</b>. ${ZEKER}`, o:['Ravi zit in het team.','Ravi is het enige teamlid.','Ravi kan in het team zitten.','Ravi zit niet in het team.'], a:2, w:'Iedereen in het team draagt een blauwe pet. Maar iemand buiten het team kan ook zo’n pet dragen.'},
 {q:`Alle <b>boeken van de leesclub</b> hebben <b>een sticker</b>. Alle boeken met <b>een sticker</b> liggen <b>op tafel</b>. Yara ziet een boek <b>op tafel</b>. ${ZEKER}`, o:['Het boek is van de leesclub.','Het boek heeft een sticker.','Het boek is niet van de leesclub.','Het boek kan van de leesclub zijn.'], a:3, w:'De boeken van de leesclub liggen op tafel. Er kunnen ook andere boeken op tafel liggen.'},
 {q:`Iedereen met <b>een zwempas</b> mag in het <b>diepe bad</b>. Wie in het <b>diepe bad</b> mag, krijgt een stempel. Bente krijgt <b>geen stempel</b>. ${ZEKER}`, o:['Bente heeft een zwempas.','Bente heeft geen zwempas.','Iedereen met een stempel heeft een zwempas.','Bente mag in het diepe bad.'], a:1, w:'Met een zwempas zou Bente in het diepe mogen en daardoor een stempel krijgen.'},
]},
{p:2, qs:[
 {q:'Fien staat <b>vóór Lars</b>. Lars staat <b>vóór Noud</b>. Tel vanaf de voorkant. Kijk naar <b>plek 2</b>. Wie staat daar?', o:['Fien','Noud','Lars','Dat weet je niet.'], a:2, w:'De volgorde is Fien, Lars, Noud.'},
 {q:'Aya, Bo, Cem en Dex staan in de rij. Aya staat <b>vóór Bo</b>. Cem staat <b>achter Bo</b>. Dex staat <b>vóór Aya</b>. Kijk naar <b>plek 3</b>. Wie staat daar?', o:['Bo','Aya','Cem','Dex'], a:0, w:'De volgorde is Dex, Aya, Bo, Cem.'},
 {q:'Ava, Bo, Cem, Dex en Elin staan in de rij. Elin staat <b>meteen achter Dex</b>. Cem staat <b>vóór Dex</b>. Ava staat <b>achteraan</b>. Bo staat <b>vóór Cem</b>. Kijk naar <b>plek 4</b>. Wie staat daar?', o:['Elin','Bo','Cem','Dex'], a:0, w:'De volgorde is Bo, Cem, Dex, Elin, Ava.'},
 {q:'Ami, Bo, Cem, Dex en Elin staan in de rij. Cem staat <b>ergens vóór Bo</b>. Dex staat <b>meteen achter Elin</b>. Ami staat <b>meteen vóór Bo</b>. Bo staat <b>niet achteraan</b>. Kijk naar <b>het midden</b>. Wie staat daar?', o:['Ami','Bo','Cem','Elin'], a:1, w:'Cem, Ami en Bo staan in die volgorde. Het paar Elin–Dex kan alleen daarna staan, anders staat Bo achteraan.'},
]},
{p:2, wide:true, qs:[
 {q:`<b>Als het regent</b>, <b>spelen we binnen</b>. <b>Het regent</b>. ${ZEKER}`, o:['We spelen buiten.','We spelen binnen.','Het spel gaat niet door.','De regen stopt zo.'], a:1, w:'De afspraak is: bij regen spelen we binnen. Het regent.'},
 {q:`Er zijn meerdere lades. De sleutel ligt in één ervan. Als de sleutel in de <b>rode lade</b> ligt, staat de <b>lamp aan</b>. De <b>lamp staat uit</b>. ${ZEKER}`, o:['De sleutel ligt in de rode lade.','Er is geen sleutel.','De sleutel ligt in de bovenste lade.','De sleutel ligt in een andere lade.'], a:3, w:'Als de sleutel in de rode lade lag, zou de lamp aanstaan.'},
 {q:`Als de <b>fiets in de schuur</b> staat, is de <b>deur dicht</b>. Als de <b>deur dicht</b> is, brandt het lampje. Het <b>lampje brandt niet</b>. ${ZEKER}`, o:['De fiets staat in de schuur.','De deur is dicht.','De fiets staat niet in de schuur.','De schuur is leeg.'], a:2, w:'Het lampje is uit, dus de deur is open. Met de fiets in de schuur zou de deur dicht zijn.'},
 {q:`Als het toneelstuk begint, gaat het <b>licht uit</b>, <b>klinkt er muziek</b>, of gebeurt allebei. Het <b>licht blijft aan</b>. Je hoort <b>geen muziek</b>. ${ZEKER}`, o:['Het toneelstuk is begonnen.','De zaal is leeg.','Het toneelstuk is nog niet begonnen.','Het gordijn is dicht.'], a:2, w:'Bij het begin merk je minstens één teken: het licht gaat uit of je hoort muziek. Geen van beide gebeurt.'},
]},
{p:2, wide:true, qs:[
 {q:`Dit zijn namen van fantasiedieren. <b>Alle daks zijn loms</b>. <b>Pika is een dak</b>. ${ZEKER}`, o:['Pika is geen lom.','Alle loms zijn daks.','Er bestaan geen andere loms.','Pika is een lom.'], a:3, w:'Pika valt als dak ook in de groep loms.'},
 {q:`<b>Alle zems zijn vaps</b>. <b>Geen enkele vap is een nok</b>. ${ZEKER}`, o:['Alle noks zijn zems.','Alle vaps zijn zems.','Geen enkele zem is een nok.','Sommige zems zijn noks.'], a:2, w:'Elke zem is een vap, en vaps en noks hebben geen overlap.'},
 {q:`<b>Alle loms zijn zeks</b>. <b>Geen enkele zek is een feg</b>. Een deel van de loms is <b>ook een nip</b>. ${ZEKER}`, o:['Geen enkele nip is een zek.','Sommige nips zijn geen fegs.','Alle nips zijn loms.','Geen enkele nip is een lom.'], a:1, w:'De nips die ook loms zijn, zijn zeks. Die nips kunnen geen fegs zijn.'},
 {q:`Alle daks zijn <b>loms of zeks, of allebei</b>. <b>Geen enkele lom is een feg</b>. Een deel van de daks <b>is een feg</b>. ${ZEKER}`, o:['Alle daks zijn zeks.','Sommige zeks zijn fegs.','Geen enkele zek is een lom.','Alle fegs zijn daks.'], a:1, w:'De daks die fegs zijn, kunnen geen loms zijn. Dus vallen die daks onder de zeks.'},
]},
{p:2, qs:[
 {q:'Fay, Mo en Suus kiezen <b>elk een andere kleur</b>: rood, groen of blauw. <b>Fay kiest rood</b>. <b>Mo kiest groen</b>. Je zoekt het kind dat <b>blauw kiest</b>. Wie kan het zijn?', o:['alleen Fay','alleen Mo','Fay of Mo','alleen Suus'], a:3, w:'Fay en Mo hebben rood en groen. Alleen voor Suus blijft blauw over.'},
 {q:'Mats, Liva en Zayn kiezen <b>elk een andere sport</b>: hockey, judo of tennis. <b>Mats kiest hockey</b>. Liva kiest <b>geen judo</b>. Je zoekt het kind dat <b>judo kiest</b>. Wie kan het zijn?', o:['alleen Zayn','alleen Mats','alleen Liva','Liva of Zayn'], a:0, w:'Mats kiest hockey. Liva kan dan alleen tennis kiezen. Voor Zayn blijft judo over.'},
 {q:'Liv, Mo en Noor hebben <b>elk een ander huisdier</b>: een kat, hond of konijn. Mo heeft <b>geen kat</b>. Noor heeft <b>geen hond</b>. Liv heeft <b>geen konijn</b>. Je zoekt het kind <b>met de kat</b>. Wie kan het zijn?', o:['alleen Liv','alleen Noor','Liv of Noor','Mo of Noor'], a:2, w:'Liv kan de kat hebben als Mo de hond heeft en Noor het konijn. Noor kan de kat hebben als Liv de hond heeft en Mo het konijn.'},
 {q:'Aïcha, Bo, Cem en Dewi doen <b>elk iets anders</b>: lezen, tekenen, meten of bouwen. <b>Bo leest niet</b>. Cem <b>tekent of meet</b>. Dewi <b>leest of bouwt</b>. Aïcha <b>bouwt niet</b>. Je zoekt het kind dat leest. Wie kan het zijn?', o:['alleen Aïcha','Bo of Cem','Aïcha of Dewi','alleen Dewi'], a:2, w:'Aïcha kan lezen als Dewi bouwt, Cem tekent en Bo meet. Dewi kan lezen als Bo bouwt, Cem tekent en Aïcha meet.'},
]},
{p:2, qs:[
 {q:'Ties en Mila zeggen allebei dat ze de bal hebben. <b>Eén van hen heeft gelijk</b>. <b>Ties liegt</b>. Wie heeft de bal?', o:['Ties','Mila','allebei','geen van beiden'], a:1, w:'Ties liegt over de bal. Mila zegt de waarheid en heeft hem dus.'},
 {q:'Fien of Lars heeft een stift. <b>Precies één</b> uitspraak klopt.<span class="quote">1. <b>Fien heeft de stift.</b><br>2. <b>Lars heeft de stift niet.</b><br>3. <b>Lars heeft de stift.</b></span>Wie heeft de stift?', o:['Fien','Lars','allebei','Dat weet je niet.'], a:1, w:'Bij Fien kloppen uitspraken 1 en 2. Bij Lars klopt alleen uitspraak 3.'},
 {q:'Eén kind heeft het kaartje. <b>Precies één</b> kind heeft gelijk.<span class="quote">Sam: “<b>Ik heb het kaartje.</b>”<br>Noor: “<b>Sam heeft het kaartje niet.</b>”<br>Yara: “<b>Noor heeft het kaartje niet.</b>”</span>Wie heeft het kaartje?', o:['Sam','Noor','Yara','Dat weet je niet.'], a:1, w:'Van Sam en Noor heeft er precies één gelijk. Yara liegt dus: Noor heeft het kaartje.'},
 {q:'Eén van vier kinderen heeft een munt. <b>Precies twee</b> kinderen hebben gelijk.<span class="quote">Ava: “<b>Bo heeft hem.</b>”<br>Bo: “<b>Cem of Dex</b> heeft hem.”<br>Cem: “<b>Ava heeft hem niet.</b>”<br>Dex: “<b>Bo of Dex</b> heeft hem.”</span>Wie heeft de munt?', o:['Ava','Cem','Bo','Dex'], a:1, w:'Bij Ava klopt geen uitspraak. Bij Bo of Dex kloppen er drie. Alleen bij Cem kloppen er twee: die van Bo en Cem.'},
]},
/* DEEL 4 */
{p:3, qs:[
 {q:'Welke pijl komt <b>hierna</b>?', f:arrows([0,180,0,180,0]), o:['omlaag','omhoog','rechts','links'], a:0, w:'De pijl wijst afwisselend omhoog en omlaag.'},
 {q:'Welke pijl komt <b>hierna</b>?', f:arrows([0,90,180,270]), o:['rechts','omhoog','omlaag','links'], a:1, w:'De pijl draait steeds een kwartslag met de klok mee. Na links komt omhoog.'},
 {q:'Welke pijl komt <b>hierna</b>?', f:arrows([45,0,-45,-90,-135,180]), o:['schuin rechtsboven','schuin linksonder','schuin rechtsonder','schuin linksboven'], a:2, w:'De pijl draait telkens een achtste slag tegen de klok in. Na omlaag wijst hij schuin rechtsonder.'},
 {q:'Welke pijl komt <b>hierna</b>?', f:arrows([0,90,135,225,270]), o:['links','schuin linksboven','schuin rechtsonder','omhoog'], a:3, w:'De pijl draait om en om 90° en 45° met de klok mee. Na links volgt weer een draai van 90°: omhoog.'},
]},
{p:3, qs:[
 {q:RIJ, f:rules([[shape('sq'),TO,shape('sq')],[shape('ci'),TO,shape('ci')],[shape('tr'),TO,QB]]), o:['open vierkant','gevulde driehoek','open cirkel','open driehoek'], a:3, w:'Dezelfde open figuur staat twee keer in de rij.'},
 {q:RIJ, f:rules([[shape('sq'),TO,shape('sq',1)],[shape('ci'),TO,shape('ci',1)],[shape('tr'),TO,QB]]), o:['gevulde driehoek','open driehoek','gevulde cirkel','open cirkel'], a:0, w:'Het laatste vak is de gevulde versie van de open figuur vooraan in dezelfde rij.'},
 {q:RIJ, f:rules([[shape('tr',0,0),TO,shape('tr',1,90)],[shape('tr',0,90),TO,shape('tr',1,180)],[shape('tr',0,180),TO,QB]]), o:['zwarte driehoek naar rechts','open driehoek naar links','zwarte driehoek omhoog','zwarte driehoek naar links'], a:3, w:'Draai de driehoek een kwartslag met de klok mee en vul hem. Omlaag verandert in links.'},
 {q:RIJ, f:rules([[strip('##.'),PLUS,strip('#..'),TO,strip('.#.')],[strip('..#'),PLUS,strip('.#.'),TO,strip('.##')],[strip('##.'),PLUS,strip('.##'),TO,QB]]), o:['alleen het midden zwart','links en rechts zwart','links en midden zwart','midden en rechts zwart'], a:1, w:'Een vakje wordt zwart als het in precies één van de eerste twee stroken zwart is. Het middelste vakje is in beide zwart en valt weg.'},
]},
{p:3, wide:true, qs:[
 {q:SPIEGEL, f:grid([['','#','1','2'],['','','3','4']],{v:2}), o:['2','3','1','4'], a:2, w:'Het zwarte vakje ligt bovenaan, direct tegen de spiegellijn. Dat geldt ook voor vakje 1.'},
 {q:SPIEGEL, f:grid([['#','#','1','2'],['#','','3','4'],['','','5','6']],{v:2}), o:['2, 3 en 6','1, 3 en 5','2, 4 en 6','1, 2 en 4'], a:3, w:'Spiegelen houdt elk vakje op dezelfde hoogte. Boven worden beide vakjes zwart (1 en 2). In het midden ligt het zwarte vakje ver van de lijn, dus komt het ook ver van de lijn: vakje 4.'},
 {q:SPIEGEL, f:grid([['','#',''],['#','','#'],['1','5','4'],['2','6','3']],{h:2}), o:['1, 3 en 5','2, 3 en 5','1, 4 en 6','2, 4 en 6'], a:2, w:'Dicht bij de lijn worden de twee buitenste vakjes zwart (1 en 4). Verder van de lijn wordt het middelste vakje zwart (6).'},
 {q:SPIEGEL, f:grid([['#','A','B','C','D','E'],['F','G','H','I','#','J'],['K','L','#','M','N','O']],{v:3}), o:['A, J en O','C, H en N','E, F en L','E, G en M'], a:3, w:'Binnen dezelfde rij wisselen kolom 1 en 6, 2 en 5, 3 en 4. De zwarte vakjes komen op E, G en M.'},
]},
{p:3, qs:[
 {q:'Begin <b>op S</b>. Ga <b>1 vakje omhoog</b> en <b>1 vakje naar rechts</b>. Bij welke letter eindig je?', f:grid([['A','B','C'],['S','D','E']],{plain:1}), o:['A','C','D','B'], a:3, w:'Eén omhoog brengt je op A. Eén naar rechts brengt je op B.'},
 {q:'Begin <b>op S</b>. Ga <b>2 vakjes omhoog</b>, <b>1 naar rechts</b>, <b>1 omlaag</b> en <b>1 naar rechts</b>. Bij welke letter eindig je?', f:grid([['A','B','C','D'],['E','F','G','H'],['S','I','J','K']],{plain:1}), o:['J','F','G','H'], a:2, w:'Je komt achtereenvolgens bij E, A, B, F en G.'},
 {q:'Begin op S en <b>kijk omhoog</b>. Draai steeds <b>een kwartslag op je plek</b>. Ga <b>1 vakje vooruit</b>. Draai <b>naar rechts</b> en ga <b>2 vakjes vooruit</b>. Draai weer <b>naar rechts</b> en ga <b>1 vakje vooruit</b>. Bij welke letter eindig je?', f:grid([['A','B','C','D','E'],['F','G','H','I','J'],['K','L','S','M','N'],['O','P','Q','R','T'],['U','V','W','X','Y']],{plain:1,s:32}), o:['H','N','I','J'], a:1, w:'Je gaat van S naar H, dan naar J en dan naar N.'},
 {q:'Begin <b>op S</b> en kijk naar rechts. Draai steeds <b>een kwartslag op je plek</b>. Ga 1 vakje vooruit. Draai naar rechts en ga <b>2 vooruit</b>. Draai weer naar rechts en ga <b>2 vooruit</b>. Draai naar rechts. Ga <b>1 vooruit en 1 achteruit</b>. Draai <b>naar links</b> en ga 1 vooruit. Bij welke letter eindig je?', f:grid([['Y','X','W','V','U'],['T','R','Q','P','O'],['N','M','S','L','K'],['J','I','H','G','F'],['E','D','C','B','A']],{plain:1,s:32}), o:['I','E','D','C'], a:1, w:'De route loopt via L, B, D, I en weer D. Na linksom ga je naar E.'},
]},
{p:3, qs:[
 {q:'Draai het vierkant <b>een halve slag</b>. Waar komen de tekens terecht?', f:rotFig(grid([['.',''],['','']]), grid([['A','B'],['C','D']],{plain:1})), o:['vak D','vak A','vak B','vak C'], a:0, w:'Na een halve slag gaat linksboven naar rechtsonder.'},
 {q:'Draai het vierkant <b>een kwartslag met de klok mee</b>. Waar komen de tekens terecht?', f:rotFig(grid([['','',''],['','',''],['','.','']]), grid([['','A',''],['C','','B'],['','D','']],{plain:1})), o:['vak A','vak B','vak D','vak C'], a:3, w:'Het vakje onder het midden draait naar het vakje links van het midden.'},
 {q:'Draai het vierkant <b>een kwartslag tegen de klok in</b>. De letter van <b>de stip staat als eerste</b>. Waar komen de tekens terecht?', f:rotFig(grid([['','.',''],['x','',''],['','','']]), grid([['A','B','C'],['D','E','F'],['G','H','I']],{plain:1})), o:['D en H','H en C','A en I','B en G'], a:0, w:'De stip boven het midden schuift naar links van het midden (D). Het kruisje links van het midden schuift naar onder het midden (H).'},
 {q:'Draai het vierkant <b>een halve slag</b>. Draai daarna <b>een kwartslag tegen de klok in</b>. De letter van <b>de stip staat als eerste</b>. Waar komen de tekens terecht?', f:rotFig(grid([['','.','',''],['','','',''],['','','x',''],['','','','']],{s:32}), grid([['A','B','C','D'],['E','F','G','H'],['I','J','K','L'],['M','N','O','P']],{plain:1,s:32})), o:['H en J','B en M','N en D','D en F'], a:0, w:'Samen is dit één kwartslag met de klok mee. De stip komt op rij 2, kolom 4 (H). Het kruisje komt op rij 3, kolom 2 (J).'},
]},
{p:3, qs:[
 {q:`${DOB} Kijk naar <b>vlak E</b>. Welk vlak ligt daar <b>recht tegenover</b>?`, f:grid([['_','E','_'],['B','C','D'],['_','F','_'],['_','A','_']],{plain:1}), o:['vlak A','vlak C','vlak D','vlak F'], a:3, w:'E en F vouwen vanuit C in tegengestelde richting. Op de kubus liggen ze tegenover elkaar.'},
 {q:`${DOB} Kijk naar <b>vlak C</b>. Welk vlak ligt daar <b>recht tegenover</b>?`, f:grid([['_','_','E','_'],['A','B','C','D'],['_','_','F','_']],{plain:1}), o:['vlak B','vlak A','vlak D','vlak F'], a:1, w:'Met C als voorvlak worden B en D de zijkanten. A vouwt aan B door naar de achterkant.'},
 {q:`${DOB} Kijk naar <b>vlak K</b>. Welk vlak ligt daar <b>recht tegenover</b>?`, f:grid([['_','K','_','_'],['L','M','N','O'],['_','_','_','P']],{plain:1}), o:['vlak L','vlak N','vlak O','vlak P'], a:3, w:'Vouw de lange strook rond. K komt boven en P onder, ook al zitten ze aan verschillende vlakken vast.'},
 {q:`${DOB} Kijk naar <b>vlak H</b>. Welk vlak ligt daar <b>recht tegenover</b>?`, f:grid([['_','_','M','N'],['_','K','L','_'],['H','J','_','_']],{plain:1}), o:['vlak J','vlak L','vlak M','vlak N'], a:1, w:'Volg het trappetje H, J, K, L, M, N. Na het vouwen liggen H en L tegenover elkaar.'},
]},
];
