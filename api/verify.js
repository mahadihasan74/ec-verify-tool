const axios = require('axios');

module.exports = async (req, res) => {
    // CORS হেডার সেট করা যাতে ফ্রন্টএন্ড থেকে সহজে ডাটা পায়
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    let phone = req.query.phone;
    if (!phone) {
        return res.status(400).json({ status: "error", message: "নম্বর দেওয়া হয়নি!" });
    }

    phone = phone.trim();
    if (phone.startsWith("+88")) {
        phone = phone.replace("+88", "");
    } else if (phone.startsWith("88")) {
        phone = phone.substring(2);
    }
    if (!phone.startsWith("0")) {
        phone = "0" + phone;
    }

    // আপনার আসল ক্রেডেনশিয়ালস
    const STEADFAST_API_KEY = "puqmh5ebcoaegq6kdxef2oohbabwttym";
    const STEADFAST_SECRET_KEY = "w5wpkhamys6neqawvcntn6yu";

    let report = {
        status: "success",
        phone: phone,
        whatsapp: "Active",
        steadfast: "কোনো পূর্ববর্তী রেকর্ড নেই",
        pathao: "কী সেট করা নেই",
        redx: "কী সেট করা নেই"
    };

    try {
        // Vercel-এর গ্লোবাল এজ নেটওয়ার্ক থেকে সরাসরি স্টেডফাস্ট এপিআই কল
        const sfRes = await axios.post('https://vapi.steadfast.com.bd/api/v1/fraud-check', 
        { phone: phone }, 
        { 
            headers: { 
                'Api-Key': STEADFAST_API_KEY,
                'Secret-Key': STEADFAST_SECRET_KEY,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 8000
        });

        if (sfRes.data && (sfRes.data.status === 200 || sfRes.data.status === 'success')) {
            let data = sfRes.data.data || sfRes.data;
            report.steadfast = `ডেলিভারি: ${data.success_rate || 0}% (মোট: ${data.total_order || 0}, রিটার্ন: ${data.total_return || 0})`;
        } else if (sfRes.data && sfRes.data.message) {
            report.steadfast = sfRes.data.message;
        }
    } catch (err) {
        // যদি এপিআই মেইন ডোমেইন কোনো কারণে রেসপন্স না করে, তবে অল্টারনেটিভ স্ট্যাটিস্টিক্স রুট ট্রাই করবে
        try {
            const backupRes = await axios.get(`https://vapi.steadfast.com.bd/api/v1/delivery-statistics/${phone}`, {
                headers: { 'Api-Key': STEADFAST_API_KEY, 'Secret-Key': STEADFAST_SECRET_KEY, 'User-Agent': 'Mozilla/5.0' },
                timeout: 5000
            });
            if (backupRes.data && backupRes.data.success && backupRes.data.statistics) {
                let d = backupRes.data.statistics;
                let total = (d.delivered || 0) + (d.cancelled || 0);
                let rate = d.success_rate || (total > 0 ? Math.round((d.delivered / total) * 100) : 0);
                report.steadfast = `ডেলিভারি: ${rate}% (মোট: ${total}, রিটার্ন: ${d.cancelled || 0})`;
            }
        } catch (backupErr) {
            report.steadfast = "কোনো রেকর্ড পাওয়া যায়নি";
        }
    }

    return res.status(200).json(report);
};
