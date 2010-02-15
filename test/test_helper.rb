ENV["RAILS_ENV"] = "test"
require File.expand_path(File.dirname(__FILE__) + "/../config/environment")
require 'test_help'
require 'mocha'
require 'sham'

class ActiveSupport::TestCase
  # Transactional fixtures accelerate your tests by wrapping each test method
  # in a transaction that's rolled back on completion.  This ensures that the
  # test database remains unchanged so your fixtures don't have to be reloaded
  # between every test method.  Fewer database queries means faster tests.
  #
  # Read Mike Clark's excellent walkthrough at
  #   http://clarkware.com/cgi/blosxom/2005/10/24#Rails10FastTesting
  #
  # Every Active Record database supports transactions except MyISAM tables
  # in MySQL.  Turn off transactional fixtures in this case; however, if you
  # don't care one way or the other, switching from MyISAM to InnoDB tables
  # is recommended.
  #
  # The only drawback to using transactional fixtures is when you actually 
  # need to test transactions.  Since your test is bracketed by a transaction,
  # any transactions started in your code will be automatically rolled back.
  self.use_transactional_fixtures = true

  # Instantiated fixtures are slow, but give you @david where otherwise you
  # would need people(:david).  If you don't want to migrate your existing
  # test cases which use the @david style and don't mind the speed hit (each
  # instantiated fixtures translates to a database query per test method),
  # then set this back to true.
  self.use_instantiated_fixtures  = false

  # Setup all fixtures in test/fixtures/*.(yml|csv) for all tests in alphabetical order.
  #
  # Note: You'll currently still have to declare fixtures explicitly in integration tests
  # -- they do not yet inherit this setting
  set_fixture_class :rubric_criteria => RubricCriterion
  set_fixture_class :flexible_criteria => FlexibleCriterion

  # Add more helper methods to be used by all tests here...

  setup {
    Sham.reset
  }

  def setup_group_fixture_repos
    Group.all.each do |group|
      group.set_repo_name
      group.build_repository
    end
    Grouping.all.each do |grouping|
      grouping.create_grouping_repository_folder
    end
  end
  
  def destroy_repos
    conf = Hash.new
    conf["IS_REPOSITORY_ADMIN"] = true
    conf["REPOSITORY_PERMISSION_FILE"] = 'dummyfile'
    Repository.get_class(REPOSITORY_TYPE, conf).purge_all
  end
 
  def clear_fixtures
    Admin.delete_all
    Assignment.delete_all
    FlexibleCriterion.delete_all
    Group.delete_all
    Grouping.delete_all
    NoLateSubmissionRule.delete_all
    RubricCriterion.delete_all
    Section.delete_all
    Student.delete_all
    StudentMembership.delete_all
    Submission.delete_all
    Ta.delete_all
    TAMembership.delete_all
    User.delete_all
  end

  # This method allows us to use the url_for helper in our tests, to make
  # sure that the actions are redirecting to the correct path.
  def url_for(options)
    url = ActionController::UrlRewriter.new(@request, nil)
    url.rewrite(options)
  end
  
end

class ActiveRecord::Base

  ANSI_BOLD       = "\033[1m"
  ANSI_RESET      = "\033[0m"
  ANSI_LGRAY    = "\033[0;37m"
  ANSI_GRAY     = "\033[1;30m"

  def print_attributes
    max_value = 0
    attributes.each do |name, value|
      max_name = [max_name, name.size].max
      max_value = [max_value, value.to_s.size].max
    end
    attributes.each do |name, value|
      print "    #{ANSI_BOLD}#{name.ljust(max_name)}#{ANSI_RESET}"
      print ":"
      print "#{ANSI_GRAY}#{value.to_s.ljust(max_value)}#{ANSI_RESET}"
      print "\n"
    end
  end

end
