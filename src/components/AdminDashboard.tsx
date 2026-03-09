import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function AdminDashboard() {
  const stats = useQuery(api.admin.getDashboardStats);
  const allUsers = useQuery(api.admin.getAllUsers);
  const allRides = useQuery(api.admin.getAllRides);
  const pendingVerifications = useQuery(api.admin.getPendingVerifications);
  const allDrivers = useQuery(api.admin.getAllDrivers);
  
  const toggleUserStatus = useMutation(api.admin.toggleUserStatus);
  const initializeSettings = useMutation(api.admin.initializeSettings);
  const verifyDriver = useMutation(api.admin.verifyDriver);
  const deleteUser = useMutation(api.admin.deleteUser);
  const deleteRide = useMutation(api.rides.deleteRide);

  const handleToggleUser = async (userId: string) => {
    try {
      await toggleUserStatus({ userId: userId as any });
      toast.success("تم تحديث حالة المستخدم");
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث حالة المستخدم");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من حذف المستخدم "${userName}"؟\n\nهذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع بيانات المستخدم والوثائق المرتبطة به.`)) {
      return;
    }

    try {
      await deleteUser({ userId: userId as any });
      toast.success("تم حذف المستخدم بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء حذف المستخدم");
    }
  };

  const handleDeleteRide = async (rideId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرحلة؟\n\nهذا الإجراء لا يمكن التراجع عنه.")) {
      return;
    }

    try {
      await deleteRide({ rideId: rideId as any });
      toast.success("تم حذف الرحلة بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء حذف الرحلة");
    }
  };

  const handleInitializeSettings = async () => {
    try {
      await initializeSettings({});
      toast.success("تم تهيئة إعدادات النظام");
    } catch (error) {
      toast.error("حدث خطأ أثناء تهيئة الإعدادات");
    }
  };

  const handleVerifyDriver = async (driverId: string, action: "approve" | "reject", reason?: string) => {
    try {
      await verifyDriver({ 
        driverId: driverId as any, 
        action,
        rejectionReason: reason 
      });
      toast.success(action === "approve" ? "تم قبول السائق" : "تم رفض السائق");
    } catch (error) {
      toast.error("حدث خطأ أثناء معالجة الطلب");
    }
  };

  if (!stats) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
              <p className="text-blue-100">إجمالي المستخدمين</p>
            </div>
            <div className="text-4xl opacity-80">👥</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{stats.verifiedDrivers}</p>
              <p className="text-green-100">سائقين موثقين</p>
              <p className="text-sm text-green-200">{stats.onlineDrivers} متاح</p>
            </div>
            <div className="text-4xl opacity-80">🛺</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{stats.pendingDrivers}</p>
              <p className="text-orange-100">طلبات التوثيق</p>
              <p className="text-sm text-orange-200">في انتظار المراجعة</p>
            </div>
            <div className="text-4xl opacity-80">⏳</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{stats.totalRevenue}</p>
              <p className="text-yellow-100">إجمالي الإيرادات</p>
              <p className="text-sm text-yellow-200">جنيه</p>
            </div>
            <div className="text-4xl opacity-80">💰</div>
          </div>
        </div>
      </div>

      {/* Pending Verifications */}
      {pendingVerifications && pendingVerifications.length > 0 && (
        <div className="bg-gradient-to-br from-white to-orange-50 rounded-2xl shadow-xl p-8 border border-orange-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="text-3xl">⏳</span>
            طلبات التوثيق المعلقة ({pendingVerifications.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pendingVerifications.map((driver) => (
              <div key={driver._id} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">{driver.profile?.name}</h3>
                    <span className="text-sm text-gray-500">
                      {new Date(driver._creationTime).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">الهاتف: </span>
                      <span className="font-medium">{driver.profile?.phone}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">المحافظة: </span>
                      <span className="font-medium">{driver.city}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">رقم التوك توك: </span>
                      <span className="font-medium">{driver.carNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">رقم الرخصة: </span>
                      <span className="font-medium">{driver.licenseNumber}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">المستندات:</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {driver.criminalRecordUrl && (
                        <a 
                          href={driver.criminalRecordUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center hover:bg-blue-100 transition-all"
                        >
                          <div className="text-2xl mb-1">📄</div>
                          <div className="text-xs text-blue-800">فيش وتشبيه</div>
                        </a>
                      )}
                      {driver.idCardUrl && (
                        <a 
                          href={driver.idCardUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-green-50 border border-green-200 rounded-lg p-3 text-center hover:bg-green-100 transition-all"
                        >
                          <div className="text-2xl mb-1">🆔</div>
                          <div className="text-xs text-green-800">البطاقة</div>
                        </a>
                      )}
                      {driver.licenseUrl && (
                        <a 
                          href={driver.licenseUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center hover:bg-purple-100 transition-all"
                        >
                          <div className="text-2xl mb-1">🪪</div>
                          <div className="text-xs text-purple-800">الرخصة</div>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => handleVerifyDriver(driver._id, "approve")}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:to-green-700 font-bold transition-all transform hover:scale-105"
                    >
                      ✅ قبول
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt("سبب الرفض (اختياري):");
                        handleVerifyDriver(driver._id, "reject", reason || undefined);
                      }}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-xl hover:from-red-600 hover:to-red-700 font-bold transition-all transform hover:scale-105"
                    >
                      ❌ رفض
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-8 border border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <span className="text-3xl">⚡</span>
          إجراءات سريعة
        </h2>
        <div className="flex gap-4">
          <button
            onClick={handleInitializeSettings}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 font-medium transition-all transform hover:scale-105 shadow-lg"
          >
            تهيئة إعدادات النظام
          </button>
        </div>
      </div>

      {/* Users Management */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <span className="text-3xl">👥</span>
          إدارة المستخدمين
        </h2>
        {allUsers && allUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-right py-3 font-bold">الاسم</th>
                  <th className="text-right py-3 font-bold">البريد الإلكتروني</th>
                  <th className="text-right py-3 font-bold">الهاتف</th>
                  <th className="text-right py-3 font-bold">النوع</th>
                  <th className="text-right py-3 font-bold">المحافظة</th>
                  <th className="text-right py-3 font-bold">الحالة</th>
                  <th className="text-right py-3 font-bold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user) => (
                  <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 font-medium">{user.name}</td>
                    <td className="py-3 text-gray-600">{user.email || "غير محدد"}</td>
                    <td className="py-3 text-gray-600">{user.phone}</td>
                    <td className="py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.role === "driver" ? "bg-blue-100 text-blue-800" :
                        user.role === "admin" ? "bg-red-100 text-red-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {user.role === "driver" ? "🛺 سائق" :
                         user.role === "admin" ? "👑 مدير" : "👤 راكب"}
                      </span>
                      {user.driverInfo && (
                        <div className="mt-1 space-y-1">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.driverInfo.verificationStatus === "verified" ? "bg-green-100 text-green-800" :
                            user.driverInfo.verificationStatus === "pending_verification" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {user.driverInfo.verificationStatus === "verified" && "✅ موثق"}
                            {user.driverInfo.verificationStatus === "pending_verification" && "⏳ معلق"}
                            {user.driverInfo.verificationStatus === "rejected" && "❌ مرفوض"}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-gray-600">
                      {user.city || (user.driverInfo?.city) || "غير محدد"}
                    </td>
                    <td className="py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {user.isActive ? "✅ نشط" : "❌ معطل"}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleToggleUser(user.userId)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          user.isActive
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                      >
                        {user.isActive ? "تعطيل" : "تفعيل"}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.userId, user.name)}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">لا يوجد مستخدمين</p>
        )}
      </div>

      {/* Drivers Management */}
      <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-xl p-8 border border-green-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <span className="text-3xl">🛺</span>
          قائمة السائقين الكامل
        </h2>
        {allDrivers && allDrivers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-right py-3 font-bold">الاسم</th>
                  <th className="text-right py-3 font-bold">البريد الإلكتروني</th>
                  <th className="text-right py-3 font-bold">الهاتف</th>
                  <th className="text-right py-3 font-bold">المكان</th>
                  <th className="text-right py-3 font-bold">رقم التوك توك</th>
                  <th className="text-right py-3 font-bold">رخصة القيادة</th>
                  <th className="text-right py-3 font-bold">الحالة</th>
                  <th className="text-right py-3 font-bold">التوثيق</th>
                  <th className="text-right py-3 font-bold">المدفوعات</th>
                  <th className="text-right py-3 font-bold">الرحلات</th>
                  <th className="text-right py-3 font-bold">التقييم</th>
                  <th className="text-right py-3 font-bold">المستندات</th>
                </tr>
              </thead>
              <tbody>
                {allDrivers.map((driver) => (
                  <tr key={driver._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 font-medium">{driver.name}</td>
                    <td className="py-3 text-gray-600">{driver.email || "غير محدد"}</td>
                    <td className="py-3 text-gray-600">{driver.phone}</td>
                    <td className="py-3 text-gray-600">{driver.city || "غير محدد"}</td>
                    <td className="py-3 text-gray-600">{driver.driver?.carNumber || "-"}</td>
                    <td className="py-3 text-gray-600">{driver.driver?.licenseNumber || "-"}</td>
                    <td className="py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        driver.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {driver.isActive ? "✅ نشط" : "❌ معطل"}
                      </span>
                    </td>
                    <td className="py-3">
                      {driver.driver && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          driver.driver.verificationStatus === "verified" ? "bg-green-100 text-green-800" :
                          driver.driver.verificationStatus === "pending_verification" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {driver.driver.verificationStatus === "verified" && "✅ موثق"}
                          {driver.driver.verificationStatus === "pending_verification" && "⏳ قيد المراجعة"}
                          {driver.driver.verificationStatus === "rejected" && "❌ مرفوض"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-bold text-green-600">
                      {driver.totalPaid || 0} جنيه
                    </td>
                    <td className="py-3 font-bold text-blue-600">
                      {driver.driver?.totalRides || 0}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="font-bold">{(driver.driver?.rating || 5.0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {driver.criminalRecordUrl && (
                          <a 
                            href={driver.criminalRecordUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs"
                            title="فيش وتشبيه"
                          >
                            📄
                          </a>
                        )}
                        {driver.idCardUrl && (
                          <a 
                            href={driver.idCardUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 text-xs"
                            title="البطاقة"
                          >
                            🆔
                          </a>
                        )}
                        {driver.licenseUrl && (
                          <a 
                            href={driver.licenseUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-800 text-xs"
                            title="الرخصة"
                          >
                            🪪
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">لا يوجد سائقين</p>
        )}
      </div>

      {/* Recent Rides */}
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl shadow-xl p-8 border border-indigo-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <span className="text-3xl">🚖</span>
          الرحلات الأخيرة
        </h2>
        {allRides && allRides.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-right py-3 font-bold">الراكب</th>
                  <th className="text-right py-3 font-bold">السائق</th>
                  <th className="text-right py-3 font-bold">من</th>
                  <th className="text-right py-3 font-bold">إلى</th>
                  <th className="text-right py-3 font-bold">السعر</th>
                  <th className="text-right py-3 font-bold">الحالة</th>
                  <th className="text-right py-3 font-bold">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {allRides.slice(0, 10).map((ride) => (
                  <tr key={ride._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 font-medium">{ride.passengerName}</td>
                    <td className="py-3 text-gray-600">{ride.driverName}</td>
                    <td className="py-3 max-w-32 truncate text-gray-600">{ride.pickupLocation.address}</td>
                    <td className="py-3 max-w-32 truncate text-gray-600">{ride.dropoffLocation.address}</td>
                    <td className="py-3 font-bold text-green-600">{ride.finalPrice || ride.estimatedPrice} جنيه</td>
                    <td className="py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ride.status === "completed" ? "bg-green-100 text-green-800" :
                        ride.status === "cancelled" ? "bg-red-100 text-red-800" :
                        ride.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {ride.status === "completed" && "✅ مكتملة"}
                        {ride.status === "cancelled" && "❌ ملغاة"}
                        {ride.status === "in_progress" && "🚀 جارية"}
                        {ride.status === "searching" && "🔍 بحث"}
                        {ride.status === "accepted" && "✅ مقبولة"}
                        {ride.status === "driver_arriving" && "🚗 في الطريق"}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(ride._creationTime).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleDeleteRide(ride._id)}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">لا توجد رحلات</p>
        )}
      </div>
    </div>
  );
}
