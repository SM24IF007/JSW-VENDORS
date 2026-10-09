
(()=>{"use strict";
const dict={
 en:{navOverview:"Overview",navContractors:"Contractors",navHow:"How It Works",navRoles:"Roles",navStatus:"Status",navAdmin:"Admin",jobsTitle:"Open Roles",jobsIntro:"Choose a role, review the requirement, then move through interview, medical induction, safety induction and final joining.",formStep:"Step 01 · Initial record",formTitle:"Candidate registration.",formIntro:"Create the first digital record. Detailed joining information is completed later by the admin team.",formName:"Full legal name",formMobile:"Mobile number",formQualification:"Highest qualification",formRole:"Designation & contractor",formCancel:"Cancel",formSubmit:"Create application"},
 hi:{navOverview:"ओवरव्यू",navContractors:"कॉन्ट्रैक्टर्स",navHow:"प्रक्रिया",navRoles:"नौकरियाँ",navStatus:"स्टेटस",navAdmin:"एडमिन",jobsTitle:"खाली पद",jobsIntro:"पद चुनें, आवश्यकता देखें, फिर इंटरव्यू, मेडिकल इंडक्शन, सेफ्टी इंडक्शन और जॉइनिंग प्रक्रिया पूरी करें।",formStep:"चरण 01 · प्रारंभिक रिकॉर्ड",formTitle:"उम्मीदवार पंजीकरण",formIntro:"पहला डिजिटल रिकॉर्ड बनाएं। विस्तृत जॉइनिंग जानकारी बाद में एडमिन टीम पूरी करेगी।",formName:"पूरा कानूनी नाम",formMobile:"मोबाइल नंबर",formQualification:"उच्चतम योग्यता",formRole:"पद और कॉन्ट्रैक्टर",formCancel:"रद्द करें",formSubmit:"आवेदन बनाएं"},
 mr:{navOverview:"आढावा",navContractors:"कंत्राटदार",navHow:"प्रक्रिया",navRoles:"नोकऱ्या",navStatus:"स्थिती",navAdmin:"अॅडमिन",jobsTitle:"रिक्त पदे",jobsIntro:"पद निवडा, आवश्यकता पहा आणि नंतर मुलाखत, मेडिकल इंडक्शन, सेफ्टी इंडक्शन व अंतिम जॉइनिंग प्रक्रिया पूर्ण करा.",formStep:"टप्पा 01 · प्रारंभिक नोंद",formTitle:"उमेदवार नोंदणी",formIntro:"पहिली डिजिटल नोंद तयार करा. सविस्तर जॉइनिंग माहिती नंतर अॅडमिन टीम पूर्ण करेल.",formName:"पूर्ण कायदेशीर नाव",formMobile:"मोबाइल नंबर",formQualification:"उच्चतम पात्रता",formRole:"पद आणि कंत्राटदार",formCancel:"रद्द करा",formSubmit:"अर्ज तयार करा"}
};
function apply(lang){
 const d=dict[lang]||dict.en; document.documentElement.lang=lang==="hi"?"hi":lang==="mr"?"mr":"en";
 document.querySelectorAll("[data-i18n]").forEach(el=>{const k=el.dataset.i18n;if(d[k])el.textContent=d[k]});
 document.querySelectorAll("[data-lang]").forEach(b=>b.classList.toggle("active",b.dataset.lang===lang));
 try{localStorage.setItem("portalLang",lang)}catch(e){}
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-lang]");if(b){e.preventDefault();apply(b.dataset.lang)}});
let lang="en";try{lang=localStorage.getItem("portalLang")||"en"}catch(e){} apply(lang);
})();
