let selectedEntryIndexes = params["selector"]
let ignoreBeginning = params["ignoreBeginning"];
let ignoreCV = params["ignoreCV"];
let ignoreVC = params["ignoreVC"];
let optMethod = params["optMethod"];

if (debug) {
    console.log(`Input entries: ${entries.length}`)
    console.log(`Selected entries: ${selectedEntryIndexes.length}`)
    console.log(`ignoreBeginning: ${ignoreBeginning}`)
    console.log(`ignoreCV: ${ignoreCV}`)
    console.log(`ignoreVC: ${ignoreVC}`)
    console.log(`optMethod: ${optMethod}`)
};

let errorEntries = [];

const yoonAndSmallKana = /[きぎしじちにひびぴみり][ゃゅょ]|[キギシジチニヒビピミリ][ャュョ]|[つツ][ぁぃぅぇぉァィゥェォ]|[ぁぃぅぇぉァィゥェォ]/;

for (let index of selectedEntryIndexes) {
    let entry = entries[index]

    // ignoreBeginningがtrueで、エントリの名前が '-' で始まる場合は処理をスキップ
    if (ignoreBeginning && entry.name.startsWith('-')) {
        continue;
    }
    // ignoreCVがtrueで、かなのみ、その後に任意の文字列が続くエントリは処理をスキップ
    if (ignoreCV && /^[ぁ-んァ-ンー].*$/.test(entry.name)) {
        continue;
    }
    // ignoreCVがtrueで、拗音や小書きかなを含むエントリは処理をスキップ
    if (ignoreCV && yoonAndSmallKana.test(entry.name)) { 
        continue;
    }
    // ignoreVCがtrueで、英小文字で始まり、その後に任意の空白と半角英小文字が続き、
    // その後に任意の文字列が続くエントリはスキップ
    if (ignoreVC && /^[a-z]\s[a-z].*$/.test(entry.name)) {
        continue;
    }

    let offset = entry.points[3]
    let fixed = entry.points[0] - offset
    let preutterance = entry.points[1] - offset
    let overlap = entry.points[2] - offset
    let cutoff = entry.end
    if (cutoff > 0) {
        cutoff = -(cutoff - offset)
    } else {
        cutoff = -cutoff
    }
    try {
        switch (optMethod) {
            case 'method01':
                // overlapを、現在のpreutteranceの1/3にする
                overlap = preutterance / 3;
                // overlap値を小数点第2位で四捨五入してから更新
                overlap = Math.round(overlap * 100) / 100;
                entry.points[2] = overlap + offset;
                if (entry.points[2] < entry.start) {
                    entry.start = entry.points[2]
                };
                break;
            case 'method02':
                let inputPreutteranceValue = params["inputPreutteranceValue"];
                if (!inputPreutteranceValue) {
                // 入力値が未定義または空の場合スキップ
                continue;
                }
                // overlapとpreutteranceの比率が3:1になるように、offsetの値を変更する
                let newOffset = offset - (inputPreutteranceValue - preutterance);
                overlap = inputPreutteranceValue / 3;
                entry.points[3] = newOffset;
                entry.start = newOffset;
                // overlap値を小数点第2位で四捨五入してから更新
                overlap = Math.round(overlap * 100) / 100;
                entry.points[2] = overlap + newOffset;
                // preutteranceを更新
                entry.points[1] = entry.points[3] + inputPreutteranceValue;
                // cutoffの更新
                if (entry.end > 0) {
                entry.end = entry.end - (inputPreutteranceValue - preutterance); // 正のcutoffを更新
                } else {
                entry.end = -cutoff + (inputPreutteranceValue - preutterance);   // 負のcutoffを更新
                };                    
                break;
            case "method03":
                // overlapを3分の1にして、preutteranceもそれに合わせる
                let newOverlap = (preutterance - overlap) / 2;
                preutterance = newOverlap * 3;
                // offsetの変更分を計算
                let deltaOverlap = newOverlap - overlap;
                offset = offset - deltaOverlap;
                // 各パラメータの更新
                entry.points[1] = preutterance + offset;
                entry.points[2] = newOverlap + offset;
                entry.points[3] = offset;
                // fixedとcutoffの位置も必要に応じて調整
                entry.points[0] = (fixed + deltaOverlap) + offset;   // fixedの再計算
                // cutoffの更新
                if (entry.end < 0) {
                entry.end = -cutoff - deltaOverlap;   // 負のcutoffを更新
                };
                // entry.startの更新
                if (entry.points[2] < entry.start) {
                entry.start = entry.points[2];
                }
                if (entry.points[3] < entry.start) {
                entry.start = entry.points[3];
                }
                break;

            default:
                error({
                    en: "Unknown method",
                    zh: "未知方法",
                    ja: "不明な方式",
                });
        }
    } catch (error) {
        errorEntries.push(entry.name); // エラーが発生したエントリのインデックスを記録
        continue; // 次のエントリに移る
    }
    if (debug) {
        console.log(`Edited: ${JSON.stringify(entry)}`)
    }
}
// エラーが発生したエントリがある場合、報告して念のためログ書き
if (errorEntries.length > 0) {
    error({
        en: "An error occurred in the following entries:" + errorEntries.join(', '),
        zh: "以下条目发生错误：" + errorEntries.join(', '),
        ja: "以下のエントリでエラーが発生しました：" + errorEntries.join(', '),
    });
    if (debug) {
        console.log(`Error: ${errorEntries.join(', ')}`)
    }
}
