import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ProfileSetup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [city, setCity] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [driverCode, setDriverCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // File upload states (required for drivers)
  const [criminalRecord, setCriminalRecord] = useState<File | null>(null);
  const [idCardImage, setIdCardImage] = useState<File | null>(null);
  const [licenseImage, setLicenseImage] = useState<File | null>(null);
  
  // File input refs
  const criminalRecordRef = useRef<HTMLInputElement>(null);
  const idCardRef = useRef<HTMLInputElement>(null);
  const licenseRef = useRef<HTMLInputElement>(null);

  const cities = useQuery(api.users.getCities) || [];
  const createProfile = useMutation(api.users.createProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const uploadFile = async (file: File): Promise<string> => {
    const uploadUrl = await generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    
    if (!result.ok) {
      throw new Error("Failed to upload file");
    }
    
    const { storageId } = await result.json();
    return storageId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (role === "driver") {
      if (!carNumber.trim() || !licenseNumber.trim() || !city || !driverCode.trim()) {
        toast.error("يرجى ملء جميع بيانات السائق بما في ذلك كود السائق");
        return;
      }
      
      // Check required documents for ALL drivers
      if (!criminalRecord || !idCardImage || !licenseImage) {
        toast.error("جميع المستندات مطلوبة للسائقين (فيش وتشبيه، صورة البطاقة، صورة الرخصة)");
        return;
      }
    }

    setIsLoading(true);
    try {
      let criminalRecordId, idCardImageId, licenseImageId;
      
      if (role === "driver") {
        // Upload documents - required for ALL drivers
        if (criminalRecord) criminalRecordId = await uploadFile(criminalRecord);
        if (idCardImage) idCardImageId = await uploadFile(idCardImage);
        if (licenseImage) licenseImageId = await uploadFile(licenseImage);
      }

      await createProfile({
        name: name.trim(),
        phone: phone.trim(),
        role,
        city: role === "driver" ? city : undefined,
        carNumber: role === "driver" ? carNumber.trim() : undefined,
        licenseNumber: role === "driver" ? licenseNumber.trim() : undefined,
        criminalRecordId: criminalRecordId as any,
        idCardImageId: idCardImageId as any,
        licenseImageId: licenseImageId as any,
        adminCode: adminCode.trim() || undefined,
        driverCode: driverCode.trim() || undefined,
      });
      
      if (role === "driver") {
        toast.success("تم إنشاء الملف الشخصي بنجاح! سيتم مراجعة مستنداتك قريباً.");
      } else {
        toast.success("تم إنشاء الملف الشخصي بنجاح! يمكنك البدء في استخدام التطبيق الآن.");
      }
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء إنشاء الملف الشخصي");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-xl p-8 border border-blue-200">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🛺</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">إعداد الملف الشخصي</h2>
          <p className="text-gray-600">أكمل بياناتك للانضمام إلى منصة توك توك السنطة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاسم الكامل *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="أدخل اسمك الكامل"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="01xxxxxxxxx"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              نوع الحساب *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("passenger")}
                className={`p-6 rounded-xl border-2 transition-all transform hover:scale-105 ${
                  role === "passenger"
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-lg"
                    : "border-gray-300 hover:border-gray-400 hover:shadow-md"
                }`}
              >
                <div className="text-4xl mb-2">👤</div>
                <div className="font-bold text-lg">راكب</div>
                <div className="text-sm text-gray-600">احجز رحلاتك بسهولة</div>
              </button>
              <button
                type="button"
                onClick={() => setRole("driver")}
                className={`p-6 rounded-xl border-2 transition-all transform hover:scale-105 ${
                  role === "driver"
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-lg"
                    : "border-gray-300 hover:border-gray-400 hover:shadow-md"
                }`}
              >
                <div className="text-4xl mb-2">🛺</div>
                <div className="font-bold text-lg">سائق توك توك</div>
                <div className="text-sm text-gray-600">اربح من خلال القيادة</div>
              </button>
            </div>
          </div>

          {/* Admin Code Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كود المدير (اختياري)
            </label>
            <input
              type="password"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="أدخل كود المدير إذا كنت مديراً"
            />
          </div>

          {role === "driver" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كود السائق *
              </label>
              <input
                type="password"
                value={driverCode}
                onChange={(e) => setDriverCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="أدخل كود السائق"
                required
              />
              <p className="text-sm text-green-600 mt-2">
                🔐 كود السائق مطلوب لجميع السائقين
              </p>
            </div>
          )}

          {role === "driver" && (
            <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-2">📋</span>
                بيانات السائق
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المكان *
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="">اختر المكان</option>
                    {cities.map((cityName) => (
                      <option key={cityName} value={cityName}>
                        {cityName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم التوك توك *
                  </label>
                  <input
                    type="text"
                    value={carNumber}
                    onChange={(e) => setCarNumber(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="مثال: أ ب ج 123"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم رخصة القيادة *
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="رقم رخصة القيادة"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                  <span className="text-xl mr-2">📄</span>
                  المستندات المطلوبة *
                </h4>
                
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start">
                    <span className="text-red-600 text-xl mr-2">⚠️</span>
                    <div className="text-sm text-red-800">
                      <p className="font-medium mb-1">مطلوب رفع جميع المستندات!</p>
                      <p>يجب رفع الفيش وتشبيه وصورة البطاقة وصورة الرخصة للمراجعة قبل البدء في العمل.</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      فيش وتشبيه *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        ref={criminalRecordRef}
                        onChange={(e) => setCriminalRecord(e.target.files?.[0] || null)}
                        accept="image/*,.pdf"
                        className="hidden"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => criminalRecordRef.current?.click()}
                        className={`w-full p-4 border-2 border-dashed rounded-xl transition-all ${
                          criminalRecord 
                            ? "border-green-500 bg-green-50 text-green-700" 
                            : "border-red-300 bg-red-50 hover:border-red-400"
                        }`}
                      >
                        <div className="text-2xl mb-1">
                          {criminalRecord ? "✅" : "📄"}
                        </div>
                        <div className="text-sm font-medium">
                          {criminalRecord ? "تم الرفع" : "رفع الفيش *"}
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      صورة البطاقة *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        ref={idCardRef}
                        onChange={(e) => setIdCardImage(e.target.files?.[0] || null)}
                        accept="image/*"
                        className="hidden"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => idCardRef.current?.click()}
                        className={`w-full p-4 border-2 border-dashed rounded-xl transition-all ${
                          idCardImage 
                            ? "border-green-500 bg-green-50 text-green-700" 
                            : "border-red-300 bg-red-50 hover:border-red-400"
                        }`}
                      >
                        <div className="text-2xl mb-1">
                          {idCardImage ? "✅" : "🆔"}
                        </div>
                        <div className="text-sm font-medium">
                          {idCardImage ? "تم الرفع" : "رفع البطاقة *"}
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      صورة الرخصة *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        ref={licenseRef}
                        onChange={(e) => setLicenseImage(e.target.files?.[0] || null)}
                        accept="image/*"
                        className="hidden"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => licenseRef.current?.click()}
                        className={`w-full p-4 border-2 border-dashed rounded-xl transition-all ${
                          licenseImage 
                            ? "border-green-500 bg-green-50 text-green-700" 
                            : "border-red-300 bg-red-50 hover:border-red-400"
                        }`}
                      >
                        <div className="text-2xl mb-1">
                          {licenseImage ? "✅" : "🪪"}
                        </div>
                        <div className="text-sm font-medium">
                          {licenseImage ? "تم الرفع" : "رفع الرخصة *"}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start">
                    <span className="text-blue-600 text-xl mr-2">ℹ️</span>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">عملية المراجعة</p>
                      <p>سيتم مراجعة مستنداتك من قبل الإدارة. قد تستغرق العملية من دقائق إلى ساعات أو أيام حسب الحمولة.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                جاري الإنشاء...
              </div>
            ) : (
              "إنشاء الملف الشخصي"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
