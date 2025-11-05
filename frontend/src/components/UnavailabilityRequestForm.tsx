import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from './ui/badge';

interface UnavailableDate {
  date: string;
  shifts: ('DAY' | 'EVENING' | 'NIGHT')[];
}

const UnavailabilityRequestForm = () => {
  const { apiCall } = useAuth();
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [currentDate, setCurrentDate] = useState('');
  const [currentShifts, setCurrentShifts] = useState<('DAY' | 'EVENING' | 'NIGHT')[]>([]);
  const [reason, setReason] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleShift = (shift: 'DAY' | 'EVENING' | 'NIGHT') => {
    if (currentShifts.includes(shift)) {
      setCurrentShifts(currentShifts.filter(s => s !== shift));
    } else {
      setCurrentShifts([...currentShifts, shift]);
    }
  };

  const addDate = () => {
    if (!currentDate) {
      setError('Please select a date');
      return;
    }
    if (currentShifts.length === 0) {
      setError('Please select at least one shift');
      return;
    }

    // Check if date already exists
    if (unavailableDates.some(d => d.date === currentDate)) {
      setError('This date is already added. Remove it first to modify.');
      return;
    }

    setUnavailableDates([...unavailableDates, {
      date: currentDate,
      shifts: [...currentShifts]
    }]);
    setCurrentDate('');
    setCurrentShifts([]);
    setError(null);
  };

  const removeDate = (date: string) => {
    setUnavailableDates(unavailableDates.filter(d => d.date !== date));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (unavailableDates.length === 0) {
      setError('Please add at least one unavailable date');
      setLoading(false);
      return;
    }

    if (!validUntil) {
      setError('Please select a valid until date');
      setLoading(false);
      return;
    }

    try {
      const response = await apiCall('/unavailability', {
        method: 'POST',
        body: {
          unavailableDates,
          reason,
          validUntil
        }
      });

      setSuccess('Unavailability request submitted successfully! It will be reviewed by administration.');
      setUnavailableDates([]);
      setReason('');
      setValidUntil('');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case 'DAY':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'EVENING':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'NIGHT':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Request Unavailability
        </CardTitle>
        <CardDescription>
          Submit a request to indicate when you will not be available for specific shifts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Instructions */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>How to submit:</strong> Add unavailable dates, select shifts, then set a "Valid Until" date before submitting.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Add Unavailable Dates */}
          <div className="space-y-4">
            <Label>Add Unavailable Dates</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label>Shifts</Label>
                <div className="flex gap-2 mt-2">
                  {(['DAY', 'EVENING', 'NIGHT'] as const).map(shift => (
                    <label key={shift} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={currentShifts.includes(shift)}
                        onCheckedChange={() => toggleShift(shift)}
                      />
                      <span className="text-sm">{shift}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={addDate}
                disabled={!currentDate || currentShifts.length === 0}
                className="w-full sm:w-auto"
              >
                Add Date
              </Button>
              {(!currentDate || currentShifts.length === 0) && (
                <p className="text-xs text-gray-500">
                  {!currentDate ? 'Select a date first' : 'Select at least one shift'}
                </p>
              )}
            </div>
          </div>

          {/* List of Added Dates */}
          {unavailableDates.length > 0 && (
            <div className="space-y-2">
              <Label>Unavailable Dates ({unavailableDates.length})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {unavailableDates.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatDate(item.date)}</span>
                      <div className="flex gap-1">
                        {item.shifts.map(shift => (
                          <Badge key={shift} className={getShiftColor(shift)}>
                            {shift}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDate(item.date)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for unavailability..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {reason.length}/500 characters
            </p>
          </div>

          {/* Valid Until */}
          <div>
            <Label htmlFor="validUntil">
              Valid Until Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="validUntil"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
              className={!validUntil ? 'border-red-300' : ''}
            />
            <p className="text-xs text-gray-500 mt-1">
              This request will be valid until this date (required)
            </p>
          </div>

          {/* Submit Button with validation messages */}
          <div className="space-y-2">
            {unavailableDates.length === 0 && (
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Please add at least one unavailable date above
              </p>
            )}
            {!validUntil && unavailableDates.length > 0 && (
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Please select a "Valid Until" date
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || unavailableDates.length === 0 || !validUntil}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UnavailabilityRequestForm;

