import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { getMeals, createMeal, updateMeal } from '../services/meal.service.js';
import { PageHeader, PageSkeleton } from '../components/ui/Page.jsx';
import { Utensils, Plus, CheckCircle, ShieldAlert, BadgeDollarSign } from 'lucide-react';

const Meals = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form parameters
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [mealForm, setMealForm] = useState({
    nameEn: '', nameAm: '', descriptionEn: '', descriptionAm: '', price: '', status: 'ACTIVE'
  });
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchMealsList = async () => {
    try {
      const res = await getMeals();
      setMeals(res.data || []);
    } catch (err) {
      console.error('Failed to load menu list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealsList();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setProcessing(true);

    try {
      if (editingMeal) {
        // Handle update
        const res = await updateMeal(editingMeal.id, {
          ...mealForm,
          price: parseFloat(mealForm.price),
        });
        if (res.success) {
          setActionSuccess('Meal item successfully updated!');
          setShowAddModal(false);
          setEditingMeal(null);
          setMealForm({ nameEn: '', nameAm: '', descriptionEn: '', descriptionAm: '', price: '', status: 'ACTIVE' });
          fetchMealsList();
        }
      } else {
        // Handle creation
        const res = await createMeal({
          ...mealForm,
          price: parseFloat(mealForm.price),
        });
        if (res.success) {
          setActionSuccess('Meal item successfully configured and active!');
          setShowAddModal(false);
          setMealForm({ nameEn: '', nameAm: '', descriptionEn: '', descriptionAm: '', price: '', status: 'ACTIVE' });
          fetchMealsList();
        }
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Action execution failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditClick = (meal) => {
    setEditingMeal(meal);
    setMealForm({
      nameEn: meal.nameEn || '',
      nameAm: meal.nameAm || '',
      descriptionEn: meal.descriptionEn || '',
      descriptionAm: meal.descriptionAm || '',
      price: meal.price || '',
      status: meal.status || 'ACTIVE'
    });
    setShowAddModal(true);
  };

  if (loading) return <PageSkeleton cards={0} />;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-app-primary  tracking-tight">{t('meals.title')}</h1>
          <p className="text-app-secondary text-sm font-medium">{t('meals.subtitle')}</p>
        </div>

        {['ADMIN', 'FINANCE'].includes(user?.role) && (
          <button
            onClick={() => {
              setEditingMeal(null);
              setMealForm({ nameEn: '', nameAm: '', descriptionEn: '', descriptionAm: '', price: '', status: 'ACTIVE' });
              setShowAddModal(true);
            }}
            className="btn-primary w-full sm:w-auto py-3"
          >
            <Plus className="w-5 h-5" />
            <span>{t('meals.addButton')}</span>
          </button>
        )}
      </div>

      {/* Alerts feedback */}
      {(actionError || actionSuccess) && (
        <div className="max-w-2xl">
          {actionError && (
            <div className="alert-error">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {actionSuccess && (
            <div className="alert-success">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}
        </div>
      )}

      {/* Catalog Grid items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {meals.length === 0 ? (
          <div className="col-span-full text-center py-12 text-app-muted">{t('meals.noMeals')}</div>
        ) : (
          meals.map((meal) => (
            <div key={meal.id} className="glass-card flex flex-col justify-between p-6 bg-app-surface/40 relative overflow-hidden group">
              <div className="space-y-4">
                {/* Header status badge & Price tags */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-app-secondary text-sm font-bold font-mono">
                    <BadgeDollarSign className="w-4 h-4 icon-accent" />
                    <span>${parseFloat(meal.price).toFixed(2)}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    meal.status === 'ACTIVE'
                      ? 'badge-active'
                      : 'badge-error'
                  }`}>
                    {meal.status}
                  </span>
                </div>

                {/* Localized titles */}
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-app-primary  tracking-tight">{meal.name}</h3>
                  <p className="text-app-secondary text-xs leading-relaxed font-medium line-clamp-3">{meal.description}</p>
                </div>
              </div>

              {/* Operations edit shortcuts for managers */}
              {['ADMIN', 'FINANCE'].includes(user?.role) && (
                <div className="mt-6 pt-4 border-t border-app-border flex justify-end">
                  <button
                    onClick={() => handleEditClick(meal)}
                    className="text-xs font-medium text-app-secondary hover:text-app-primary transition-colors uppercase tracking-widest cursor-pointer"
                  >
                    {t('meals.editButton')}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Dish dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card p-8 bg-app-surface border border-app-border max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white  mb-6 flex items-center gap-2">
              <Utensils className="w-5 h-5 icon-accent" />
              <span>{editingMeal ? 'Modify Meal Dish' : 'Add New Meal Option'}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* English Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                    {t('meals.nameEn')}
                  </label>
                  <input
                    type="text"
                    required
                    value={mealForm.nameEn}
                    onChange={(e) => setMealForm({ ...mealForm, nameEn: e.target.value })}
                    placeholder="E.g., Chicken Rice"
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                    {t('meals.nameAm')}
                  </label>
                  <input
                    type="text"
                    required
                    value={mealForm.nameAm}
                    onChange={(e) => setMealForm({ ...mealForm, nameAm: e.target.value })}
                    placeholder="Ej., Arroz con Pollo"
                    className="glass-input"
                  />
                </div>
              </div>

              {/* Description Fields */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                  {t('meals.descEn')}
                </label>
                <textarea
                  required
                  rows="2"
                  value={mealForm.descriptionEn}
                  onChange={(e) => setMealForm({ ...mealForm, descriptionEn: e.target.value })}
                  placeholder="Describe the dish contents in English"
                  className="glass-input"
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                  {t('meals.descAm')}
                </label>
                <textarea
                  required
                  rows="2"
                  value={mealForm.descriptionAm}
                  onChange={(e) => setMealForm({ ...mealForm, descriptionAm: e.target.value })}
                  placeholder={t('meals.descAmPlaceholder')}
                  className="glass-input"
                ></textarea>
              </div>

              {/* Price & status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={mealForm.price}
                    onChange={(e) => setMealForm({ ...mealForm, price: e.target.value })}
                    placeholder="9.99"
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                    Display Status
                  </label>
                  <select
                    value={mealForm.status}
                    onChange={(e) => setMealForm({ ...mealForm, status: e.target.value })}
                    className="glass-input cursor-pointer"
                  >
                    <option value="ACTIVE" className="bg-app-surface">ACTIVE</option>
                    <option value="INACTIVE" className="bg-app-surface">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-app-surface-2 hover:bg-app-surface-2 font-semibold py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 btn-primary"
                >
                  {processing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <span>Save Dish</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Meals;
