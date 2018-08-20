class TestBatch < ApplicationRecord
  has_many :test_runs, dependent: :nullify

  def adjust_time_to_service_estimate(time_delta)
    test_runs.each do |test_run|
      if test_run.in_progress? && test_run.time_to_service_estimate && test_run.time_to_service&.positive?
        new_estimate = [(test_run.time_to_service_estimate - time_delta).to_i, 0].max
        test_run.update_attributes(time_to_service_estimate: new_estimate)
      end
    end
  end

  def time_to_completion_hash
    now = Time.now
    mean_run_time = DescriptiveStatistics.mean(test_runs.map(&:run_time).compact) || 0
    test_run_times = test_runs.map do |tr|
      elapsed_time = now - tr.created_at
      expected_time_to_completion = (tr.time_to_service_estimate || 0) + mean_run_time
      time_to_completion = [expected_time_to_completion - elapsed_time, 0].max
      time_to_completion = time_to_completion.round(-3) / 1000
      [tr.id, time_to_completion]
    end
    test_run_times.to_h
  end
end
