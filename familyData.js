/*
 * بيانات شجرة حدارى عفيف
 * ----------------------
 * كل استدعاء add ينشئ شخصًا بمعرّف مستقل حتى عند تكرار الاسم.
 * ترتيب الاستدعاءات تحت الأب هو ترتيب العرض، ولا يوجد فرز أبجدي تلقائي.
 */
(function () {
  "use strict";

  const people = [];
  let sequence = 0;

  function add(name, parentId = null, options = {}) {
    const id = `person_${String(++sequence).padStart(3, "0")}`;
    const sortOrder = people.filter((person) => person.parentId === parentId).length + 1;
    people.push({
      id,
      name,
      fullName: options.fullName || name,
      parentId,
      deceased: options.deceased === true,
      sortOrder,
    });
    return id;
  }

  function addChildren(parentId, names) {
    return names.map((name) => add(name, parentId));
  }

  // الجذر الأول: معيض
  const muayedRoot = add("معيض");
  const eidMuayed = add("عيد", muayedRoot, { fullName: "عيد معيض", deceased: true });
  const samranMuayed = add("سمران", muayedRoot, { fullName: "سمران معيض", deceased: true });
  const fahdMuayed = add("فهد", muayedRoot, { fullName: "فهد معيض" });
  const fuhaydMuayed = add("فهيد", muayedRoot, { fullName: "فهيد معيض" });
  const mutebMuayed = add("متعب", muayedRoot, { fullName: "متعب معيض" });
  const majedMuayed = add("ماجد", muayedRoot, { fullName: "ماجد معيض" });

  const saudEid = add("سعود", eidMuayed); add("طارق", saudEid);
  const saadEid = add("سعد", eidMuayed); addChildren(saadEid, ["بندر", "ريان"]);
  const ayadEid = add("عياد", eidMuayed); addChildren(ayadEid, ["سامر", "ثنيان"]);
  const muayedEid = add("معيض", eidMuayed); addChildren(muayedEid, ["سيف", "ماهو", "عيد"]);
  addChildren(eidMuayed, ["ناصر", "متعب"]);

  const mishalSamran = add("مشعل", samranMuayed); addChildren(mishalSamran, ["عبدالرحمن", "عبدالإله"]);
  const badrSamran = add("بدر", samranMuayed); add("ثامر", badrSamran);
  const salmanSamran = add("سلمان", samranMuayed); addChildren(salmanSamran, ["عزام", "بسام", "سامي"]);
  const hatemSamran = add("حاتم", samranMuayed); add("عدي", hatemSamran);
  addChildren(samranMuayed, ["مقرن", "جراح"]);

  add("زيد", fahdMuayed);
  const mohammedFahd = add("محمد", fahdMuayed); addChildren(mohammedFahd, ["فهد", "احمد"]);
  const dhaifAllahFahd = add("ضيف الله", fahdMuayed); add("ماجد", dhaifAllahFahd);
  addChildren(fahdMuayed, ["مشاري", "عبدالعزيز", "عبدالكريم"]);

  const mohsenFuhayd = add("محسن", fuhaydMuayed); addChildren(mohsenFuhayd, ["ممدوح", "مشهور"]);
  add("معيض", fuhaydMuayed);

  addChildren(mutebMuayed, ["مشعل", "سعد", "فواز", "محمد"]);

  const fahdMajed = add("فهد", majedMuayed); addChildren(fahdMajed, ["حسان", "ماجد", "عبدالله", "ابراهيم"]);
  addChildren(majedMuayed, ["سالم", "طلال", "مازن", "مشاري"]);

  // الجذر الثاني: جويعد
  const juwayidRoot = add("جويعد");
  const awadJuwayid = add("عوض", juwayidRoot, { fullName: "عوض جويعد" });
  const suwaylimJuwayid = add("سويلم", juwayidRoot, { fullName: "سويلم جويعد" });
  const mishalJuwayid = add("مشعل", juwayidRoot, { fullName: "مشعل جويعد" });

  const mohammedAwad = add("محمد", awadJuwayid); addChildren(mohammedAwad, ["زياد", "نادر", "طايل"]);
  const mubarakAwad = add("مبارك", awadJuwayid); add("غيث", mubarakAwad);
  const fahdAwad = add("فهد", awadJuwayid); addChildren(fahdAwad, ["عبدالعزيز", "سند"]);
  add("غانم", awadJuwayid, { deceased: true });
  add("يوسف", awadJuwayid);
  const faisalAwad = add("فيصل", awadJuwayid); addChildren(faisalAwad, ["يوسف", "فارس"]);
  add("خالد", awadJuwayid);
  const abdullahAwad = add("عبدالله", awadJuwayid); add("سلطان", abdullahAwad);

  const mukhlidSuwaylim = add("مخلد", suwaylimJuwayid); addChildren(mukhlidSuwaylim, ["عمر", "مصعب", "انس", "يزيد", "ياسر"]);
  addChildren(suwaylimJuwayid, ["سليمان", "مبارك"]);
  const salmanSuwaylim = add("سلمان", suwaylimJuwayid); add("عدي", salmanSuwaylim);

  addChildren(mishalJuwayid, ["معاذ", "غيث", "عوض"]);

  // الجذر الثالث: خليوي
  const khulaiwiRoot = add("خليوي");
  const mutlaqKhulaiwi = add("مطلق", khulaiwiRoot, { fullName: "مطلق خليوي" });
  const saudKhulaiwi = add("سعود", khulaiwiRoot, { fullName: "سعود خليوي" });
  const saadKhulaiwi = add("سعد", khulaiwiRoot, { fullName: "سعد خليوي" });
  const salemKhulaiwi = add("سالم", khulaiwiRoot, { fullName: "سالم خليوي" });

  addChildren(mutlaqKhulaiwi, ["بدر", "بندر", "احمد", "عبدالله", "علي","شاكر"]);
  addChildren(saudKhulaiwi, ["محمد", "خالد", "فيصل", "عبدالعزيز", "صالح", "وليد"]);
  addChildren(saadKhulaiwi, ["نواف", "مطلق"]);
  const mohammedSaad = add("محمد", saadKhulaiwi); add("سعد", mohammedSaad);
  add("فهد", saadKhulaiwi);
  addChildren(salemKhulaiwi, ["سلطان", "سطام", "ناصر", "هتان"]);

  // الجذر الرابع: عايض. «عايض سالم» هو الاسم الكامل للجذر كما ورد في المصدر.
  const ayedRoot = add("عايض", null, { fullName: "عايض سالم" });
  const muayedAyed = add("معيض", ayedRoot); addChildren(muayedAyed, ["نواف", "عبدالله", "منصور", "مشاري"]);
  const awadhAyed = add("عواض", ayedRoot); addChildren(awadhAyed, ["فارس", "فيصل", "فهد", "سامي", "عبدالعزيز"]);
  const abdullahAyed = add("عبدالله", ayedRoot); add("نايف", abdullahAyed);

  // الجذر الخامس: قعيد. «قعيد سالم» هو الاسم الكامل للجذر كما ورد في المصدر.
  const qaidRoot = add("قعيد", null, { fullName: "قعيد سالم" });
  const salemQaid = add("سالم", qaidRoot); add("معن", salemQaid);
  addChildren(qaidRoot, ["مطلق", "عبدالرحمن", "عبدالله", "عبدالمجيد", "فواز"]);
  // ورد «فايز» أيضًا في البيانات التفصيلية؛ أُبقي كشخص مستقل بعد الترتيب الإلزامي.
  add("فايز", qaidRoot);

  const rootIds = [muayedRoot, juwayidRoot, khulaiwiRoot, ayedRoot, qaidRoot];

  window.FAMILY_DATA = Object.freeze({
    familyName: "حدارى عفيف",
    displayTitle: "أبناء سالم الحداري - ع",
    rootIds: Object.freeze(rootIds),
    people: Object.freeze(people.map((person) => Object.freeze(person))),
  });
})();
